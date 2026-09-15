const BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path) {
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
}

exports.search = async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    // If a specific type is given, only search that type
    if (type) {
      const validTypes = ["movie", "tv"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: "Type must be 'movie' or 'tv'",
        });
      }

      const data = await tmdbFetch(
        `/search/${type}?query=${encodeURIComponent(query)}`
      );

      const raw = data && data.results ? data.results : [];
      const results = raw.map((item) => {
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
      });

      return res.json({ page: 1, total_results: results.length, results });
    }

    // Otherwise search both movies and tv shows at once
    const [movies, tv] = await Promise.all([
      tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}`),
      tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`),
    ]);

    const movieResults = (movies && movies.results ? movies.results : []).map(
      (m) => ({
        type: "movie",
        id: m.id,
        title: m.title,
        overview: m.overview,
        release_date: m.release_date,
        vote_average: m.vote_average,
        poster_path: m.poster_path,
      })
    );

    const tvResults = (tv && tv.results ? tv.results : []).map((t) => ({
      type: "tv",
      id: t.id,
      name: t.name,
      overview: t.overview,
      first_air_date: t.first_air_date,
      vote_average: t.vote_average,
      poster_path: t.poster_path,
    }));

    // Interleave movies and TV shows so the grid is balanced and mixed
    const results = [];
    const maxLen = Math.max(movieResults.length, tvResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movieResults.length) results.push(movieResults[i]);
      if (i < tvResults.length) results.push(tvResults[i]);
    }

    res.json({
      page: 1,
      total_results: movieResults.length + tvResults.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong",
    });
  }
};

exports.tvDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "TV show id is required",
      });
    }

    const data = await tmdbFetch(`/tv/${id}`);

    if (!data) {
      return res.status(404).json({
        error: "TV show not found",
      });
    }

    const result = {
      id: data.id,
      name: data.name,
      overview: data.overview,
      first_air_date: data.first_air_date,
      last_air_date: data.last_air_date,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      seasons: (data.seasons || []).map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
      })),
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong",
    });
  }
};

exports.tvSeries = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        error: "Series name is required",
      });
    }

    const searchData = await tmdbFetch(
      `/search/tv?query=${encodeURIComponent(name)}`
    );

    if (!searchData || !searchData.results || searchData.results.length === 0) {
      return res.status(404).json({
        error: "No series found",
      });
    }

    const show = searchData.results[0];
    const detail = await tmdbFetch(`/tv/${show.id}`);

    if (!detail) {
      return res.status(404).json({
        error: "Series details not found",
      });
    }

    const seasons = (detail.seasons || [])
      .filter((s) => s.season_number >= 1)
      .map((s) => ({ season_number: s.season_number, name: s.name }));

    for (const season of seasons) {
      const seasonData = await tmdbFetch(
        `/tv/${show.id}/season/${season.season_number}`
      );
      season.episodes = (seasonData && seasonData.episodes
        ? seasonData.episodes
        : []
      ).map((e) => ({
        episode_number: e.episode_number,
        name: e.name,
      }));
    }

    res.json({
      id: show.id,
      name: detail.name,
      first_air_date: detail.first_air_date,
      last_air_date: detail.last_air_date,
      seasons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Something went wrong",
    });
  }
};
