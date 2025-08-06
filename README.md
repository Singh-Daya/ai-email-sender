# ai-email-sender

#  AI-Generated Email Sender

A full-stack Next.js application that generates professional emails using the **Groq API** and sends them via **SMTP**.  
Users can enter a prompt, get an AI-generated email draft, edit it, and send it to multiple recipients.


## Features

-  AI-powered email generation using Groq's LLM
-  Email sending via SMTP (Gmail)
-  Automatic subject line extraction
-  Responsive UI with loading states
-  Type-safe API endpoints
-  Serverless deployment ready

## Prerequisites

- Node.js 18+
- npm 
- Groq API key
- SMTP credentials

## Getting Started

1. **Clone the repository**
   git clone https://github.com/Singh-Daya/ai-email-sender.git

Install dependencies: npm install

Set up environment variables

Create a .env.local file:env

# Groq Configuration
GROQ_API_KEY=your_groq_api_key

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_USER=your@gmail.com

SMTP_PASS=your-app-password

FROM_EMAIL=your@gmail.com

Run the development server

npm run dev
**Deployment Vercel**
Push your code to GitHub

Create a new project in Vercel Dashboard

Add all environment variables

Deploy!

**Environment Variables**
Variable	Required	Description

GROQ_API_KEY	=	Your Groq API key

SMTP_HOST	=	SMTP server host

SMTP_PORT	=	SMTP port (587 for TLS, 465 for SSL)

SMTP_USER	=	SMTP username

SMTP_PASS	=	SMTP password/app password

API Endpoints
**Generate Email**
POST /api/generate

json
{
  "prompt": "Write a follow-up email to a client"
}
**Response:**

json
{
  "subject": "Follow-up on our recent discussion",
  "body": "Dear Client,\n\nFollowing up on..."
}
Send Email
POST /api/send

json
{
  "recipients": "client@example.com",
  "subject": "Follow-up on our recent discussion",
  "body": "Email content here..."
}

**Tech Stack**
_Framework_: Next.js (App Router)

_AI Service_: Groq

_Email_: Nodemailer

_Validation_: Zod

_Deployment_: Vercel

**Troubleshooting**
1.Emails Not Sending

2.Verify SMTP credentials

3.Check spam folder

4.Test with different ports (587 or 465)

5.Enable "Less Secure Apps" in Gmail if using Gmail SMTP

6.AI Generation Issues

7.Check Groq API key

8.Verify internet connection

9.Test with different prompts
