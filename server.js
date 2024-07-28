require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5175'];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(helmet());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB Atlas', err);
    });

const studentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    identifyNumber: { type: String, required: true },
    universityAdmissionYear: { type: Number, required: true }   ,
    birthDate: { type: Date, required: true },
    birthCity: { type: String, required: true },
    school: { type: String, required: true },
    program: { type: String, required: true },
    voucher: { type: String },
    grant: { type: String },
    sociality: { type: String },
    learningLanguage: { type: String },
    freshmanOrTransfer: { type: String, enum: ['Freshman', 'Transfer'], required: true },
    mobilitySemester: { type: String },
    agent: { type: String },
    email: { type: String, required: true }, 
});

studentSchema.plugin(AutoIncrement, { inc_field: 'id' });

const Student = mongoose.model('Student', studentSchema);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

const validateStudent = [
    body('firstName').isString().withMessage('First name must be a string'),
    body('lastName').isString().withMessage('Last name must be a string'),
    body('identifyNumber').isString().withMessage('Identify number must be a string'),
    body('universityAdmissionYear').isNumeric().withMessage('University admission year must be a number'),
    body('birthDate').isISO8601().toDate().withMessage('Birth date must be a valid date'),
    body('birthCity').isString().withMessage('Birth city must be a string'),
    body('school').isString().withMessage('School must be a string'),
    body('program').isString().withMessage('Program must be a string'),
    body('voucher').optional().isString().withMessage('Voucher must be a string'),
    body('grant').optional().isString().withMessage('Grant must be a string'),
    body('sociality').optional().isString().withMessage('Sociality must be a string'),
    body('learningLanguage').optional().isString().withMessage('Learning language must be a string'),
    body('freshmanOrTransfer').isIn(['Freshman', 'Transfer']).withMessage('Freshman or transfer must be either "Freshman" or "Transfer"'),
    body('mobilitySemester').optional().isString().withMessage('Mobility semester must be a string'),
    body('agent').optional().isString().withMessage('Agent must be a string'),
    body('email').isEmail().withMessage('Email must be a valid email address'),
];

app.get('/allstudents', async (req, res) => {
    try {
        const students = await Student.find();
        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

app.post('/addstudent', validateStudent, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const newStudent = new Student(req.body);
        const savedStudent = await newStudent.save();
        res.status(201).json(savedStudent);
    } catch (err) {
        res.status(500).json({ message: 'Error adding student' });
    }
});

app.delete('/deletestudent/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Student.findOneAndDelete({ id });
        if (!result) return res.status(404).json({ message: 'Student not found' });
        res.status(200).json({ message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting student' });
    }
});

app.put('/editstudent/:id', validateStudent, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const updatedStudent = await Student.findOneAndUpdate({ id }, req.body, { new: true });
        if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
        res.status(200).json(updatedStudent);
    } catch (err) {
        res.status(500).json({ message: 'Error updating student' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});