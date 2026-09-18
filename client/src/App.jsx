import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API = '/api'
const IMG = 'https://image.tmdb.org/t/p/w300'
const IMG_LG = 'https://image.tmdb.org/t/p/w500'

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cine_user') || 'null'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authMsg, setAuthMsg] = useState('')
  const [showAuth, setShowAuth] = useState(false)

  const [page, setPage] = useState('search')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showGenresMsg, setShowGenresMsg] = useState('')

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('both')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const [lists, setLists] = useState({ favorites: [], watchLater: [], watching: [], watchlist: [], history: [], genres: [] })

  const [detailItem, setDetailItem] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [openSeasons, setOpenSeasons] = useState({})

  const [recs, setRecs] = useState({ forYou: [], similar: [], trending: [] })
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState('')
  const [recTick, setRecTick] = useState(0)

  const img = (p, lg) => p ? `${lg ? IMG_LG : IMG}${p}` : ''

  const doAuth = useCallback(async (e) => {
    e.preventDefault()
    setAuthMsg('')
    const url = authMode === 'login' ? `${API}/auth/login` : `${API}/auth/register`
    const body = authMode === 'login' ? { email, password } : { name, email, password }
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setAuthMsg(data.message || 'Error'); return }
      const u = { id: data.user.id, name: data.user.name, email: data.user.email }
      setUser(u)
      localStorage.setItem('cine_user', JSON.stringify(u))
      localStorage.setItem('cine_token', data.token)
      setAuthMsg('')
      setShowAuth(false)
      setEmail(''); setPassword(''); setName('')
    } catch { setAuthMsg('Could not connect to server') }
  }, [authMode, email, password, name])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('cine_user')
    localStorage.removeItem('cine_token')
    setLists({ favorites: [], watchLater: [], watching: [], watchlist: [], history: [], genres: [] })
    setPage('search')
    setResults([])
    setSearched(false)
  }, [])

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...(options.headers || {}) }
    const token = localStorage.getItem('cine_token')
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) logout()
    return res
  }, [logout])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch(`${API}/user/${user.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cine_token') || ''}` },
    })
      .then((r) => {
        if (r.status === 401) { logout(); return null }
        return r.json()
      })
      .then((d) => { if (!cancelled && d) setLists(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, logout])

  const recordHistory = useCallback(async (term) => {
    if (!user) return
    try {
      const res = await authFetch(`${API}/user/history/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      })
      const data = await res.json()
      if (data.success) setLists((p) => ({ ...p, history: data.history }))
    } catch { /* ignored */ }
  }, [user, authFetch])

  useEffect(() => {
    if (!showProfileMenu) return
    const onDoc = (e) => {
      if (!e.target.closest('.profile-trigger')) setShowProfileMenu(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [showProfileMenu])

  async function search(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSearched(true)
    recordHistory(query.trim())
    try {
      const base = `${API}/search?query=${encodeURIComponent(query)}`
      const url = filter === 'both' ? base : `${base}&type=${filter}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); setResults([]) }
      else { setResults(data.results || []) }
    } catch { setError('Could not connect to server'); setResults([]) }
    finally { setLoading(false) }
  }

  async function openDetail(item) {
    setDetailItem(item)
    setDetailData(null)
    setDetailLoading(true)
    try {
      if (item.type === 'tv') {
        const res = await fetch(`${API}/tvseries?name=${encodeURIComponent(item.name || item.title)}`)
        const data = await res.json()
        setDetailData(data)
      } else {
        setDetailData(null)
      }
    } catch { setDetailData(null) }
    finally { setDetailLoading(false) }
  }

  function inList(ln, item) {
    return (lists[ln] || []).some((x) => String(x.id) === String(item.id) && x.type === item.type)
  }

  async function addToList(ln, item) {
    if (!user) { setShowAuth(true); return }
    try {
      const res = await authFetch(`${API}/user/${user.id}/${ln}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
      const data = await res.json()
      if (data.success) setLists((p) => ({ ...p, [ln]: data[ln] }))
    } catch { /* ignored */ }
  }

  async function removeFromList(ln, item) {
    if (!user) return
    try {
      const res = await authFetch(`${API}/user/${user.id}/${ln}/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setLists((p) => ({ ...p, [ln]: data[ln] }))
    } catch { /* ignored */ }
  }

  async function updateReach(item, season, episode) {
    if (!user) return
    try {
      const res = await authFetch(`${API}/user/${user.id}/watchlist/${item.id}/reach`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ season, episode }) })
      const data = await res.json()
      if (data.success) setLists((p) => ({ ...p, watchlist: data.watchlist }))
    } catch { /* ignored */ }
  }

  function toggle(ln, item) {
    inList(ln, item) ? removeFromList(ln, item) : addToList(ln, item)
  }

  const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller']

  async function saveGenres(genre) {
    if (!user) return
    const current = lists.genres || []
    const next = current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    setShowGenresMsg('')
    try {
      const res = await authFetch(`${API}/user/${user.id}/genres`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genres: next }) })
      const data = await res.json()
      if (data.success) {
        setLists((p) => ({ ...p, genres: data.genres }))
        setShowGenresMsg('Preferences updated ✨')
      }
    } catch { /* ignored */ }
  }

  async function deleteHistoryItem(term) {
    if (!user) return
    try {
      const res = await authFetch(`${API}/user/history/${user.id}/${encodeURIComponent(term)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setLists((p) => ({ ...p, history: data.history }))
    } catch { /* ignored */ }
  }

  const loadRecs = useCallback(async () => {
    setRecLoading(true)
    setRecError('')
    try {
      const res = await authFetch(`${API}/recommendations`)
      const data = await res.json()
      if (!res.ok) { setRecError(data.message || 'Could not load recommendations'); return }
      setRecs({ forYou: data.forYou || [], similar: data.similar || [], trending: data.trending || [] })
    } catch { setRecError('Could not connect to server') }
    finally { setRecLoading(false) }
  }, [authFetch])

  useEffect(() => {
    if (page !== 'forYou') return
    const id = setTimeout(loadRecs, 0)
    return () => clearTimeout(id)
  }, [page, recTick, loadRecs])

  const REC_SECTIONS = [
    { key: 'forYou', title: 'Based on your taste' },
    { key: 'similar', title: 'Because you liked...' },
    { key: 'trending', title: 'Trending now' },
  ]

  const FILTERS = [
    { id: 'both', label: 'All' },
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'Series' },
  ]

  const SIDEBAR_ITEMS = user ? [
    { id: 'forYou', icon: '🎯', label: 'For You' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'watchlist', icon: '📋', label: 'My Watchlist' },
    { id: 'watchLater', icon: '⏳', label: 'Watch Later' },
    { id: 'favorites', icon: '♥', label: 'Favorites' },
    { id: 'history', icon: '🕐', label: 'Search History' },
  ] : [
    { id: 'search', icon: '🔍', label: 'Search' },
  ]

  return (
    <div className="app">
      {/* ---- NAVBAR ---- */}
      <header className="navbar">
        <div className="nav-left">
          {user && (
            <button className="hamburger" type="button" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          )}
          <div className="nav-brand">
            <span className="brand-mark">CF</span>
            <span className="brand-name">CineFlex</span>
          </div>
        </div>
        {user ? (
          <div className="nav-right">
            <span className="greeting">Hello, {user.name} 👋</span>
            <button type="button" onClick={logout} className="btn-ghost">Logout</button>
          </div>
        ) : (
          <div className="nav-right">
            <button type="button" className="btn-ghost" onClick={() => { setAuthMode('login'); setShowAuth(true) }}>Log in</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => { setAuthMode('register'); setShowAuth(true) }}>Sign up</button>
          </div>
        )}
      </header>

      {/* ---- AUTH MODAL ---- */}
      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowAuth(false)}>×</button>
            <h2 className="modal-title">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <form className="auth-form" onSubmit={doAuth}>
              {authMode === 'register' && <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" className="btn-primary btn-block">{authMode === 'login' ? 'Log in' : 'Sign up'}</button>
              {authMsg && <p className="auth-msg">{authMsg}</p>}
              <p className="auth-switch">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                  {authMode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ---- DETAIL MODAL ---- */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => { setDetailItem(null); setDetailData(null) }}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => { setDetailItem(null); setDetailData(null) }}>×</button>
            <div className="detail-layout">
              <div className="detail-poster">
                {detailItem.poster_path ? <img src={img(detailItem.poster_path, true)} alt={detailItem.title || detailItem.name} /> : <div className="no-poster">No image</div>}
              </div>
              <div className="detail-info">
                <h2 className="detail-title">{detailItem.title || detailItem.name}</h2>
                <div className="detail-meta">
                  <span className={`badge ${detailItem.type}`}>{detailItem.type === 'tv' ? 'Series' : 'Movie'}</span>
                  <span>{(detailItem.release_date || detailItem.first_air_date || '').slice(0, 4)}</span>
                  <span className="rating">★ {detailItem.vote_average?.toFixed(1) ?? '-'}</span>
                </div>
                <p className="detail-overview">{detailItem.overview}</p>
                <div className="detail-actions">
                  <button className={inList('favorites', detailItem) ? 'btn-saved' : 'btn-accent'} onClick={() => toggle('favorites', detailItem)}>
                    {inList('favorites', detailItem) ? '♥ Favorited' : '♥ Favorite'}
                  </button>
                  <button className={inList('watchLater', detailItem) ? 'btn-saved' : 'btn-accent'} onClick={() => toggle('watchLater', detailItem)}>
                    {inList('watchLater', detailItem) ? '★ Watch Later' : 'Watch Later'}
                  </button>
                  <button className={inList('watchlist', detailItem) ? 'btn-saved' : 'btn-accent'} onClick={() => toggle('watchlist', detailItem)}>
                    {inList('watchlist', detailItem) ? '✓ Watchlist' : '+ Watchlist'}
                  </button>
                </div>
                {detailLoading && <p className="detail-loading">Loading details...</p>}
                {detailData && detailData.seasons && (
                  <div className="detail-seasons">
                    <h3>Seasons <span className="seasons-total">({(() => detailData.seasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0))() || detailData.number_of_episodes} episodes total)</span></h3>
                    {(() => {
                      const wlItem = (lists.watchlist || []).find((x) => String(x.id) === String(detailItem.id) && x.type === 'tv')
                      const canTrack = !!wlItem
                      const rSeason = wlItem?.reach?.season ?? 0
                      const rEp = wlItem?.reach?.episode ?? 0
                      return detailData.seasons.map((s) => {
                        const isOpen = !!openSeasons[s.season_number]
                        const total = s.episodes.length
                        const watchedInSeason = canTrack && s.season_number < rSeason ? total : canTrack && s.season_number === rSeason ? Math.min(rEp, total) : 0
                        return (
                          <div key={s.season_number} className="season-block">
                            <button type="button" className={`season-head ${isOpen ? 'open' : ''}`} onClick={() => setOpenSeasons((p) => ({ ...p, [s.season_number]: !p[s.season_number] }))}>
                              <span className="season-chevron">{isOpen ? '▾' : '▸'}</span>
                              <span className="season-name">Season {s.season_number}{s.name ? ` · ${s.name}` : ''}</span>
                              <span className="season-count">{total} ep{total !== 1 ? 's' : ''} · {watchedInSeason}/{total} watched</span>
                            </button>
                            {isOpen && (
                              <div className="season-eps">
                                {s.episodes.map((ep) => {
                                  const reached = canTrack && (s.season_number < rSeason || (s.season_number === rSeason && ep.episode_number <= rEp))
                                  const isCurrent = canTrack && s.season_number === rSeason && ep.episode_number === rEp
                                  return (
                                    <button
                                      key={ep.episode_number}
                                      className={`ep-tag ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
                                      onClick={() => canTrack && updateReach(detailItem, s.season_number, ep.episode_number)}
                                      disabled={!canTrack}
                                      title={ep.name || (canTrack ? `Mark up to S${s.season_number}E${ep.episode_number}` : 'Add to watchlist to track')}
                                    >
                                      <span className="ep-num">E{ep.episode_number}</span>
                                      {ep.name ? <span className="ep-name">{ep.name}</span> : null}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
                {detailItem.type === 'tv' && inList('watchlist', detailItem) && (
                  <ReachControl item={detailItem} lists={lists} updateReach={updateReach} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* ---- SIDEBAR ---- */}
        {user && (
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <nav className="sidebar-nav">
              {SIDEBAR_ITEMS.map((si) => (
                <button key={si.id} className={`sidebar-item ${page === si.id ? 'active' : ''}`}
                  onClick={() => { setPage(si.id); setSidebarOpen(false) }}>
                  <span className="sidebar-label">{si.label}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar-footer">
              <div className="profile-trigger sidebar-profile">
                <button type="button" className="sidebar-profile-btn" onClick={(e) => { e.stopPropagation(); setShowProfileMenu((v) => !v) }}>
                  <span className="sidebar-profile-avatar">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="sidebar-profile-name">{user.name}</span>
                  <span className="sidebar-profile-arrow">{showProfileMenu ? '▲' : '▼'}</span>
                </button>
                {showProfileMenu && (
                  <div className="profile-menu sidebar-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-menu-head">
                      <div className="profile-menu-avatar">{user.name.charAt(0).toUpperCase()}</div>
                      <div className="profile-menu-info">
                        <span className="profile-menu-name">{user.name}</span>
                        <span className="profile-menu-email">{user.email}</span>
                      </div>
                    </div>
                    <button type="button" className="profile-menu-item" onClick={() => { setShowProfileMenu(false); setPage('profile'); setSidebarOpen(false) }}>My Profile</button>
                    <button type="button" className="profile-menu-item" onClick={() => { setShowProfileMenu(false); setPage('watchlist'); setSidebarOpen(false) }}>My Watchlist</button>
                    <button type="button" className="profile-menu-item" onClick={() => { setShowProfileMenu(false); setPage('favorites'); setSidebarOpen(false) }}>Favorites</button>
                    <button type="button" className="profile-menu-item danger" onClick={() => { setShowProfileMenu(false); logout() }}>Logout</button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ---- MAIN ---- */}
        <main className="main">
          {/* SEARCH PAGE */}
          {page === 'search' && (
            <>
              <section className="search-section">
                <label htmlFor="search" className="search-label">What do you want to watch?</label>
                <form className="search-form" onSubmit={search}>
                  <input id="search" type="text" placeholder="Search movies & series..." value={query} onChange={(e) => setQuery(e.target.value)} />
                  <button type="submit" className="btn-primary">Search</button>
                </form>
                <div className="filters">
                  {FILTERS.map((f) => (
                    <button key={f.id} className={`filter-btn ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
                  ))}
                </div>
              </section>
              {loading && <p className="status">Searching...</p>}
              {error && <p className="error">{error}</p>}
              {searched && !loading && !error && <p className="status">Found {results.length} result{results.length === 1 ? '' : 's'}</p>}
              <section className="results">
                {results.map((item) => (
                  <Card key={`${item.type}-${item.id}`} item={item} img={img} inList={inList} toggle={toggle} onDetail={openDetail} />
                ))}
                {searched && !loading && results.length === 0 && !error && <p className="empty">No results found.</p>}
              </section>
              {!searched && (
                <div className="welcome">
                  <h2>Welcome to CineFlex</h2>
                  <p>Search for any movie or TV series to get started.</p>
                </div>
              )}
            </>
          )}

          {/* FOR YOU PAGE */}
          {page === 'forYou' && (
            <>
              <div className="page-head">
                <h2 className="page-title">For You</h2>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setRecTick((t) => t + 1)} disabled={recLoading}>↻ Refresh</button>
              </div>
              {recLoading && <p className="status">Curating your picks...</p>}
              {recError && <p className="error">{recError}</p>}
              {REC_SECTIONS.map((sec) => {
                const items = recs[sec.key] || []
                if (items.length === 0) return null
                return (
                  <section key={sec.key} className="rec-section">
                    <h3 className="rec-title">{sec.title}</h3>
                    <div className="results">
                      {items.map((item) => (
                        <Card key={`${item.type}-${item.id}`} item={item} img={img} inList={inList} toggle={toggle} onDetail={openDetail} />
                      ))}
                    </div>
                  </section>
                )
              })}
              {!recLoading && !recError && !REC_SECTIONS.some((s) => (recs[s.key] || []).length > 0) && (
                <p className="empty">Pick a few favorite categories in your profile or save some titles, and we'll build your picks here.</p>
              )}
            </>
          )}

          {/* WATCHLIST PAGE */}
          {page === 'watchlist' && (
            <>
              <h2 className="page-title">My Watchlist</h2>
              <section className="results">
                {(lists.watchlist || []).map((item) => (
                  <Card key={`${item.type}-${item.id}`} item={item} img={img} inList={inList} toggle={toggle} onDetail={openDetail} />
                ))}
                {(!lists.watchlist || lists.watchlist.length === 0) && <p className="empty">Nothing in your watchlist yet. Search for something!</p>}
              </section>
            </>
          )}

          {/* FAVORITES PAGE */}
          {page === 'favorites' && (
            <>
              <h2 className="page-title">Favorites</h2>
              <section className="results">
                {(lists.favorites || []).map((item) => (
                  <Card key={`${item.type}-${item.id}`} item={item} img={img} inList={inList} toggle={toggle} onDetail={openDetail} />
                ))}
                {(!lists.favorites || lists.favorites.length === 0) && <p className="empty">No favorites yet. Tap ♥ on any item to add it here.</p>}
              </section>
            </>
          )}

          {/* WATCH LATER PAGE */}
          {page === 'watchLater' && (
            <>
              <h2 className="page-title">Watch Later</h2>
              <section className="results">
                {(lists.watchLater || []).map((item) => (
                  <Card key={`${item.type}-${item.id}`} item={item} img={img} inList={inList} toggle={toggle} onDetail={openDetail} />
                ))}
                {(!lists.watchLater || lists.watchLater.length === 0) && <p className="empty">Nothing saved for later. Tap Watch Later on any item to add it here.</p>}
              </section>
            </>
          )}

          {/* HISTORY PAGE */}
          {page === 'history' && (
            <>
              <h2 className="page-title">Search History</h2>
              <div className="history-list">
                {(lists.history || []).map((h, i) => (
                  <div key={i} className="history-item">
                    <button className="history-search-btn" onClick={() => { setQuery(h.term); setPage('search'); setTimeout(() => document.querySelector('#search')?.focus(), 100) }}>
                      <span className="history-icon">🕐</span>
                      <span className="history-term">{h.term}</span>
                      <span className="history-time">{new Date(h.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </button>
                    <button className="history-delete" onClick={() => deleteHistoryItem(h.term)} title="Delete">✕</button>
                  </div>
                ))}
                {(!lists.history || lists.history.length === 0) && <p className="empty">No search history yet.</p>}
              </div>
            </>
          )}

          {/* PROFILE PAGE */}
          {page === 'profile' && (
            <>
              <h2 className="page-title">Profile</h2>
              <div className="profile-card">
                <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <h3 className="profile-name">{user.name}</h3>
                <p className="profile-email">{user.email}</p>
                <div className="profile-stats">
                  <div className="stat"><span className="stat-num">{(lists.watchlist || []).length}</span><span className="stat-label">Watchlist</span></div>
                  <div className="stat"><span className="stat-num">{(lists.favorites || []).length}</span><span className="stat-label">Favorites</span></div>
                  <div className="stat"><span className="stat-num">{(lists.history || []).length}</span><span className="stat-label">Searches</span></div>
                </div>

                <div className="profile-genres">
                  <h4>Your favorite categories</h4>
                  <p className="profile-genres-hint">Pick what you love — we'll use these to suggest content.</p>
                  <div className="genre-chips">
                    {GENRES.map((g) => {
                      const on = (lists.genres || []).includes(g)
                      return (
                        <button key={g} type="button" className={`genre-chip ${on ? 'on' : ''}`} onClick={() => saveGenres(g)}>
                          {g} {on ? '✓' : '+'}
                        </button>
                      )
                    })}
                  </div>
                  {showGenresMsg && <p className="profile-genres-msg">{showGenresMsg}</p>}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Card({ item, img, inList, toggle, onDetail }) {
  return (
    <article className="card" onClick={() => onDetail(item)}>
      <div className="card-poster">
        {item.poster_path ? <img src={img(item.poster_path)} alt={item.title || item.name} loading="lazy" /> : <div className="no-poster">No image</div>}
        <span className={`badge ${item.type}`}>{item.type === 'tv' ? 'Series' : 'Movie'}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{item.title || item.name}</h3>
        <div className="card-meta">
          <span>{(item.release_date || item.first_air_date || '').slice(0, 4)}</span>
          <span className="rating">★ {item.vote_average?.toFixed(1) ?? '-'}</span>
        </div>
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button className={inList('favorites', item) ? 'btn-saved' : ''} onClick={() => toggle('favorites', item)}>♥</button>
          <button className={inList('watchLater', item) ? 'btn-saved' : ''} onClick={() => toggle('watchLater', item)}>★</button>
          <button className={inList('watchlist', item) ? 'btn-saved' : ''} onClick={() => toggle('watchlist', item)}>+ W</button>
        </div>
      </div>
    </article>
  )
}

function ReachControl({ item, lists, updateReach }) {
  const saved = (lists.watchlist || []).find((x) => String(x.id) === String(item.id) && x.type === item.type)
  const [season, setSeason] = useState(String(saved?.reach?.season || 1))
  const [episode, setEpisode] = useState(String(saved?.reach?.episode || 1))

  return (
    <div className="reach">
      <span className="reach-label">Your progress:</span>
      <label className="reach-label">
        S<input type="number" min="1" value={season} onChange={(e) => setSeason(e.target.value)} />
      </label>
      <label className="reach-label">
        E<input type="number" min="1" value={episode} onChange={(e) => setEpisode(e.target.value)} />
      </label>
      <button onClick={() => updateReach(item, Number(season), Number(episode))}>Save</button>
    </div>
  )
}

export default App
