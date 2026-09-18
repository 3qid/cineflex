const User = require("../models/User");

const LIST_NAMES = ["favorites", "watchLater", "watching", "watchlist", "history"];

exports.getUserLists = async (req, res) => {
  try {
    const id = req.userId;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      favorites: user.favorites || [],
      watchLater: user.watchLater || [],
      watching: user.watching || [],
      watchlist: user.watchlist || [],
      history: user.history || [],
      genres: user.genres || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.updateGenres = async (req, res) => {
  try {
    const id = req.userId;
    const { genres } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!Array.isArray(genres)) {
      return res.status(400).json({
        success: false,
        message: "genres must be an array",
      });
    }

    const unique = [...new Set(genres.map((g) => String(g).trim()).filter(Boolean))];

    await user.update({ genres: [...unique] });

    return res.json({
      success: true,
      genres: [...unique],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.addToList = async (req, res) => {
  try {
    const id = req.userId;
    const { listName } = req.params;
    const item = req.body;

    if (!LIST_NAMES.includes(listName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid list name",
      });
    }

    if (!item || typeof item !== "object") {
      return res.status(400).json({
        success: false,
        message: "Item is required",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const list = user[listName] || [];

    const alreadyExists = list.some(
      (existing) => existing.id === item.id && existing.type === item.type
    );

    if (!alreadyExists) {
      const newList = [...list, item];
      await user.update({ [listName]: newList });
    }

    return res.json({
      success: true,
      message: alreadyExists ? "Already in list" : "Item added",
      [listName]: user[listName],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.removeFromList = async (req, res) => {
  try {
    const id = req.userId;
    const { listName, itemId } = req.params;

    if (!LIST_NAMES.includes(listName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid list name",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const list = user[listName] || [];

    const newList = list.filter(
      (existing) => String(existing.id) !== String(itemId)
    );

    await user.update({ [listName]: newList });

    return res.json({
      success: true,
      message: "Item removed",
      [listName]: newList,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.updateReach = async (req, res) => {
  try {
    const id = req.userId;
    const { listName, itemId } = req.params;
    const { season, episode } = req.body;

    if (!LIST_NAMES.includes(listName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid list name",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const list = user[listName] || [];

    const item = list.find((existing) => String(existing.id) === String(itemId));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in list",
      });
    }

    const newList = list.map((existing) =>
      String(existing.id) === String(itemId)
        ? { ...existing, reach: { season: Number(season) || 1, episode: Number(episode) || 1 } }
        : existing
    );

    await user.update({ [listName]: newList });

    return res.json({
      success: true,
      message: "Progress updated",
      [listName]: newList,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.recordSearch = async (req, res) => {
  try {
    const id = req.userId;
    const { term } = req.body;

    if (!term || typeof term !== "string" || !term.trim()) {
      return res.status(400).json({
        success: false,
        message: "Term is required",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const history = user.history || [];

    const newHistory = [
      { term: term.trim(), at: new Date().toISOString() },
      ...history.filter((h) => h.term.toLowerCase() !== term.trim().toLowerCase()),
    ].slice(0, 20);

    await user.update({ history: newHistory });

    return res.json({
      success: true,
      history: newHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    const id = req.userId;
    const { term } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const history = user.history || [];

    const newHistory = history.filter((h) => h.term.toLowerCase() !== decodeURIComponent(term).toLowerCase());

    await user.update({ history: newHistory });

    return res.json({
      success: true,
      history: newHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
