const express = require('express');
const {
  getUserLists,
  addToList,
  removeFromList,
  updateReach,
  recordSearch,
  deleteHistory,
  updateGenres,
} = require('../controllers/UserController');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/:id', getUserLists);
router.put('/:id/genres', updateGenres);
router.post('/history/:id', recordSearch);
router.delete('/history/:id/:term', deleteHistory);
router.post('/:id/:listName', addToList);
router.patch('/:id/:listName/:itemId/reach', updateReach);
router.delete('/:id/:listName/:itemId', removeFromList);

module.exports = router;
