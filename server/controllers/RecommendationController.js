const User = require("../models/User");

const BASE = "https://api.themoviedb.org/3";

const MOVIE_GENRES = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Drama: 18,
  Fantasy: 14,
  Horror: 27,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  Thriller: 53,
};

const TV_GENRES = {
  Action: 10759,
  Adventure: 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Drama: 18,
  Fantasy: 10765,
  Horror: null,
  Mystery: 9648,
  Romance: null,
  "Sci-Fi": 10765,
  Thriller: null,
};

async function tmdbFetch(path) {
  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_KEY}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

function normalize(item, type) {
  if (type === "tv") {
    return {
      type: "tv",
      id: item.id,
      name: item.name,
      overview: item.overview,
      first_air_date: item.first_air_date,
      vote_average: item.vote_average,
      poster_path: item.poster_path,
    };
  }
  return {
    type: "movie",
    id: item.id,
    title: item.title,
    overview: item.overview,
    release_date: item.release_date,
    vote_average: item.vote_average,
    poster_path: item.poster_path,
  };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || item.id == null) return false;
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function genrePicks(genres) {
  const movieIds = Array.from(
    new Set(
      genres
        .map((g) => MOVIE_GENRES[g])
        .filter((id) => id != null)
    )
  );
  const tvIds = Array.from(
    new Set(
      genres
        .map((g) => TV_GENRES[g])
        .filter((id) => id != null)
    )
  );

  const requests = [];
  if (movieIds.length > 0) {
    requests.push(tmdbFetch(`/discover/movie?with_genres=${movieIds.join(",")}&sort_by=popularity.desc&vote_count.gte=100`));
  } else {
    requests.push(Promise.resolve(null));
  }
  if (tvIds.length > 0) {
    requests.push(tmdbFetch(`/discover/tv?with_genres=${tvIds.join(",")}&sort_by=popularity.desc&vote_count.gte=100`));
  } else {
    requests.push(Promise.resolve(null));
  }

  const [movies, tv] = await Promise.all(requests);

  const picks = [];
  if (movies && Array.isArray(movies.results)) {
    picks.push(...movies.results.map((m) => normalize(m, "movie")));
  }
  if (tv && Array.isArray(tv.results)) {
    picks.push(...tv.results.map((t) => normalize(t, "tv")));
  }
  return picks;
}

async function similarPicks(user) {
  const seeds = [
    ...(user.favorites || []),
    ...(user.watchLater || []),
    ...(user.watchlist || []),
  ].slice(0, 3);

  const results = await Promise.all(
    seeds.map((seed) => {
      const kind = seed.type === "tv" ? "tv" : "movie";
      return tmdbFetch(`/${kind}/${seed.id}/similar`);
    })
  );

  return results.flatMap((data, i) => {
    if (!data || !Array.isArray(data.results)) return [];
    const seed = seeds[i];
    const kind = seed.type === "tv" ? "tv" : "movie";
    return data.results.map((item) => normalize(item, kind));
  });
}

async function trendingPicks() {
  const data = await tmdbFetch("/trending/all/week");

  if (!data || !Array.isArray(data.results)) return [];

  return data.results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => normalize(item, item.media_type));
}

exports.recommendations = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const genres = (user.genres || []).map((g) => String(g).trim());

    const [forYou, similar, trending] = await Promise.all([
      genres.length > 0 ? genrePicks(genres) : Promise.resolve([]),
      similarPicks(user),
      trendingPicks(),
    ]);

    const seen = new Set();
    const section = (items) =>
      items.filter((item) => {
        const key = `${item.type}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return res.json({
      success: true,
      forYou: section(forYou),
      similar: section(similar),
      trending: section(trending),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};