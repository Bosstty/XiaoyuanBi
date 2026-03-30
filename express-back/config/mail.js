const nodemailer = require('nodemailer');

const mailPort = Number(process.env.MAIL_PORT || 465);
const mailSecure = process.env.MAIL_SECURE !== 'false';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.qq.com',
    port: mailPort,
    secure: mailSecure,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

module.exports = transporter;
