const GalleryItem = require('../models/GalleryItem');

// @desc    Get all gallery items
// @route   GET /api/gallery
// @access  Public
exports.getGalleryItems = async (req, res) => {
  try {
    const items = await GalleryItem.find().sort({ _id: -1 });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Create a gallery item
// @route   POST /api/gallery
// @access  Private (Admin)
exports.createGalleryItem = async (req, res) => {
  try {
    const newItem = new GalleryItem(req.body);
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update a gallery item
// @route   PUT /api/gallery/:id
// @access  Private (Admin)
exports.updateGalleryItem = async (req, res) => {
  try {
    let item = await GalleryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    item = await GalleryItem.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete a gallery item
// @route   DELETE /api/gallery/:id
// @access  Private (Admin)
exports.deleteGalleryItem = async (req, res) => {
  try {
    let item = await GalleryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    await GalleryItem.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
