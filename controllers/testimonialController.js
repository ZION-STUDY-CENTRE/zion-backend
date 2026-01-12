const Testimonial = require('../models/Testimonial');

// Get all approved testimonials
exports.getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find({ approved: true }).sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all testimonials (including unapproved) - Admin/Media Manager only
exports.getAllTestimonialsAdmin = async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new testimonial
exports.createTestimonial = async (req, res) => {
    const { name, course, rating, text, image } = req.body;

    if (!name || !course || !rating || !text) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const testimonial = new Testimonial({
            name,
            course,
            rating,
            text,
            image: image || null,
            approved: true
        });

        const savedTestimonial = await testimonial.save();
        res.status(201).json(savedTestimonial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a testimonial
exports.updateTestimonial = async (req, res) => {
    const { id } = req.params;
    const { name, course, rating, text, image, approved } = req.body;

    try {
        const testimonial = await Testimonial.findById(id);
        if (!testimonial) {
            return res.status(404).json({ message: 'Testimonial not found' });
        }

        if (name) testimonial.name = name;
        if (course) testimonial.course = course;
        if (rating) testimonial.rating = rating;
        if (text) testimonial.text = text;
        if (image) testimonial.image = image;
        if (approved !== undefined) testimonial.approved = approved;

        const updatedTestimonial = await testimonial.save();
        res.json(updatedTestimonial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a testimonial
exports.deleteTestimonial = async (req, res) => {
    const { id } = req.params;

    try {
        const testimonial = await Testimonial.findByIdAndDelete(id);
        if (!testimonial) {
            return res.status(404).json({ message: 'Testimonial not found' });
        }
        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single testimonial
exports.getTestimonial = async (req, res) => {
    const { id } = req.params;

    try {
        const testimonial = await Testimonial.findById(id);
        if (!testimonial) {
            return res.status(404).json({ message: 'Testimonial not found' });
        }
        res.json(testimonial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
