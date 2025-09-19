// Email functionality for EMIS Exam Portal

class EmailService {
  constructor() {
    this.templates = {
      credentialsEmail: {
        subject: "Your EMIS Exam Portal Login Credentials",
        template: this.getCredentialsTemplate(),
      },
      examResults: {
        subject: "Your EMIS Exam Results",
        template: this.getResultsTemplate(),
      },
      examReminder: {
        subject: "EMIS Exam Reminder",
        template: this.getReminderTemplate(),
      },
    }
  }

  // Send credentials via email (demo implementation)
  async sendCredentials(credentials, recipientEmail) {
    try {
      const emailData = {
        to: recipientEmail,
        subject: this.templates.credentialsEmail.subject,
        html: this.generateCredentialsEmail(credentials),
      }

      // In a real implementation, this would call an email API
      console.log("Sending credentials email:", emailData)

      // Simulate email sending
      await this.simulateEmailSend(emailData)

      return { success: true, message: "Credentials sent successfully" }
    } catch (error) {
      console.error("Error sending credentials:", error)
      return { success: false, message: "Failed to send credentials" }
    }
  }

  // Send exam results via email
  async sendResults(results, recipientEmail) {
    try {
      const emailData = {
        to: recipientEmail,
        subject: this.templates.examResults.subject,
        html: this.generateResultsEmail(results),
      }

      console.log("Sending results email:", emailData)
      await this.simulateEmailSend(emailData)

      return { success: true, message: "Results sent successfully" }
    } catch (error) {
      console.error("Error sending results:", error)
      return { success: false, message: "Failed to send results" }
    }
  }

  // Send exam reminder
  async sendReminder(examDetails, recipientEmail) {
    try {
      const emailData = {
        to: recipientEmail,
        subject: this.templates.examReminder.subject,
        html: this.generateReminderEmail(examDetails),
      }

      console.log("Sending reminder email:", emailData)
      await this.simulateEmailSend(emailData)

      return { success: true, message: "Reminder sent successfully" }
    } catch (error) {
      console.error("Error sending reminder:", error)
      return { success: false, message: "Failed to send reminder" }
    }
  }

  // Generate credentials email HTML
  generateCredentialsEmail(credentials) {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>EMIS Login Credentials</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #38bdf8, #1e3a8a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                    .credentials-box { background: #f8fafc; border: 2px solid #38bdf8; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
                    .btn { background: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>EMIS Exam Portal</h1>
                        <p>Epitome Model Islamic Schools</p>
                    </div>
                    
                    <div class="content">
                        <h2>Your Login Credentials</h2>
                        <p>Dear Student,</p>
                        <p>Your login credentials for the EMIS Exam Portal have been generated. Please keep this information secure and do not share it with others.</p>
                        
                        <div class="credentials-box">
                            <h3>Login Details:</h3>
                            <p><strong>Student ID:</strong> ${credentials.studentId}</p>
                            <p><strong>Username:</strong> ${credentials.username}</p>
                            <p><strong>Password:</strong> ${credentials.password}</p>
                            <p><strong>Class:</strong> ${credentials.class}</p>
                        </div>
                        
                        <p>To access the exam portal:</p>
                        <ol>
                            <li>Visit the EMIS Exam Portal</li>
                            <li>Enter your username and password</li>
                            <li>Follow the exam instructions carefully</li>
                        </ol>
                        
                        <a href="#" class="btn">Access Exam Portal</a>
                        
                        <p><strong>Important Notes:</strong></p>
                        <ul>
                            <li>Keep your credentials confidential</li>
                            <li>Ensure you have a stable internet connection</li>
                            <li>Use a compatible browser (Chrome, Firefox, Safari)</li>
                            <li>Contact support if you face any issues</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2025 EMIS - Epitome Model Islamic Schools</p>
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `
  }

  // Generate results email HTML
  generateResultsEmail(results) {
    const performanceLevel =
      results.score >= 90
        ? "Excellent"
        : results.score >= 80
          ? "Good"
          : results.score >= 70
            ? "Satisfactory"
            : "Needs Improvement"

    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>EMIS Exam Results</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #38bdf8, #1e3a8a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                    .results-box { background: #f0f9ff; border: 2px solid #38bdf8; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                    .score { font-size: 48px; font-weight: bold; color: #38bdf8; margin: 10px 0; }
                    .performance { font-size: 18px; font-weight: bold; margin: 10px 0; }
                    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                    .stat-item { background: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>EMIS Exam Portal</h1>
                        <p>Exam Results</p>
                    </div>
                    
                    <div class="content">
                        <h2>Congratulations!</h2>
                        <p>Your exam has been completed and graded. Here are your results:</p>
                        
                        <div class="results-box">
                            <h3>${results.examTitle}</h3>
                            <div class="score">${results.score}%</div>
                            <div class="performance">Performance: ${performanceLevel}</div>
                        </div>
                        
                        <div class="stats">
                            <div class="stat-item">
                                <strong>Correct Answers</strong><br>
                                ${results.correctAnswers} / ${results.totalQuestions}
                            </div>
                            <div class="stat-item">
                                <strong>Time Taken</strong><br>
                                ${Math.floor(results.timeTaken / 60)}:${(results.timeTaken % 60).toString().padStart(2, "0")}
                            </div>
                        </div>
                        
                        <p><strong>Exam Details:</strong></p>
                        <ul>
                            <li>Total Questions: ${results.totalQuestions}</li>
                            <li>Questions Answered: ${results.answeredQuestions}</li>
                            <li>Questions Flagged: ${results.flaggedCount || 0}</li>
                            <li>Completion Date: ${new Date(results.completedAt).toLocaleDateString()}</li>
                        </ul>
                        
                        ${
                          results.score >= 70
                            ? '<p style="color: #10b981; font-weight: bold;">🎉 Congratulations! You have passed the exam.</p>'
                            : '<p style="color: #ef4444; font-weight: bold;">📚 Keep studying! You can retake the exam to improve your score.</p>'
                        }
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2025 EMIS - Epitome Model Islamic Schools</p>
                        <p>Results are automatically saved to your student profile.</p>
                    </div>
                </div>
            </body>
            </html>
        `
  }

  // Generate reminder email HTML
  generateReminderEmail(examDetails) {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>EMIS Exam Reminder</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                    .reminder-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
                    .btn { background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Exam Reminder</h1>
                        <p>EMIS Exam Portal</p>
                    </div>
                    
                    <div class="content">
                        <h2>Upcoming Exam</h2>
                        <p>Dear Student,</p>
                        <p>This is a reminder about your upcoming exam. Please make sure you are prepared and ready.</p>
                        
                        <div class="reminder-box">
                            <h3>Exam Details:</h3>
                            <p><strong>Exam:</strong> ${examDetails.title}</p>
                            <p><strong>Date:</strong> ${examDetails.date}</p>
                            <p><strong>Time:</strong> ${examDetails.time}</p>
                            <p><strong>Duration:</strong> ${examDetails.duration} minutes</p>
                            <p><strong>Total Questions:</strong> ${examDetails.totalQuestions}</p>
                        </div>
                        
                        <p><strong>Preparation Checklist:</strong></p>
                        <ul>
                            <li>✅ Review your study materials</li>
                            <li>✅ Test your internet connection</li>
                            <li>✅ Ensure your device is charged</li>
                            <li>✅ Find a quiet, well-lit space</li>
                            <li>✅ Have your login credentials ready</li>
                        </ul>
                        
                        <a href="#" class="btn">Access Exam Portal</a>
                        
                        <p><strong>Important Reminders:</strong></p>
                        <ul>
                            <li>Log in 10 minutes before the exam starts</li>
                            <li>Read all instructions carefully</li>
                            <li>Manage your time effectively</li>
                            <li>Contact support if you face technical issues</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; 2025 EMIS - Epitome Model Islamic Schools</p>
                        <p>Good luck with your exam!</p>
                    </div>
                </div>
            </body>
            </html>
        `
  }

  // Simulate email sending (for demo purposes)
  async simulateEmailSend(emailData) {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          // Simulate 90% success rate
          if (Math.random() > 0.1) {
            resolve({ success: true, messageId: "msg_" + Date.now() })
          } else {
            reject(new Error("Email service temporarily unavailable"))
          }
        },
        1000 + Math.random() * 2000,
      ) // 1-3 second delay
    })
  }

  // Get email templates
  getCredentialsTemplate() {
    return "credentials_template"
  }

  getResultsTemplate() {
    return "results_template"
  }

  getReminderTemplate() {
    return "reminder_template"
  }
}

// Utility functions for email integration
function sendCredentialsEmail(credentials, email) {
  const emailService = new EmailService()
  return emailService.sendCredentials(credentials, email)
}

function sendResultsEmail(results, email) {
  const emailService = new EmailService()
  return emailService.sendResults(results, email)
}

function sendReminderEmail(examDetails, email) {
  const emailService = new EmailService()
  return emailService.sendReminder(examDetails, email)
}

// Bulk email functions
async function sendBulkCredentials(credentialsList, emailList) {
  const emailService = new EmailService()
  const results = []

  for (let i = 0; i < credentialsList.length; i++) {
    try {
      const result = await emailService.sendCredentials(credentialsList[i], emailList[i])
      results.push({ index: i, success: true, result })
    } catch (error) {
      results.push({ index: i, success: false, error: error.message })
    }
  }

  return results
}

async function sendBulkResults(resultsList, emailList) {
  const emailService = new EmailService()
  const results = []

  for (let i = 0; i < resultsList.length; i++) {
    try {
      const result = await emailService.sendResults(resultsList[i], emailList[i])
      results.push({ index: i, success: true, result })
    } catch (error) {
      results.push({ index: i, success: false, error: error.message })
    }
  }

  return results
}

// Email validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Email formatting utilities
function formatEmailList(emails) {
  return emails
    .split(/[,;\n]/)
    .map((email) => email.trim())
    .filter((email) => email && validateEmail(email))
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EmailService,
    sendCredentialsEmail,
    sendResultsEmail,
    sendReminderEmail,
    sendBulkCredentials,
    sendBulkResults,
    validateEmail,
    formatEmailList,
  }
}
