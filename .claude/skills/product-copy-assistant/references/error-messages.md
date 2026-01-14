# Error Message Patterns

## Formula

```
[What happened] + [Why it happened (optional)] + [What the user can do]
```

## By Audience

### Content Teams

Supportive, reassuring, avoids technical jargon.

**Do:**

- "Unable to save changes. Your content has been preserved in draft mode."
- "This content type requires a featured image. Add one from the media library or upload a new image."
- "It looks like someone else is editing this page. You can wait or make a copy to edit separately."

**Don't:**

- "Error code E-4032: Operation failed due to insufficient permissions in document mutation pipeline."
- "JSON schema validation error in content type."

### Developers

Precise, informative, includes technical details.

**Do:**

- "GraphQL query timeout (>30s). Consider pagination or filtering to reduce response size."
- "API rate limit exceeded (120/100 requests per minute). Retry after 32 seconds or increase your plan limit."
- "GROQ syntax error at line 12: field 'createdAt' not found."

**Don't:**

- "Query failed."
- "Too many requests."

## By Scenario

### Authentication & Authorization

**Session expired:**

- ❌ "Session invalid. Log in again."
- ✅ "Your session has expired. Sign in again to continue where you left off." + [Sign In] button

**Lacks permissions:**

- ❌ "Access denied. Insufficient permissions."
- ✅ "You need additional permissions to edit this content. Request access from your project admin or switch to view-only mode."

### Content Creation & Editing

**Validation error:**

- ❌ "Content validation failed. Check fields and try again."
- ✅ "3 fields need your attention before saving:" + [List of specific fields with issues]

**Edit conflict:**

- ❌ "Edit conflict detected."
- ✅ "Jane Doe is currently editing this document. You can wait, make a copy, or request a notification when they're finished."

### Media & Assets

**Upload failed:**

- ❌ "Upload failed. Invalid file."
- ✅ "This image couldn't be uploaded. Please use JPG, PNG, or WebP formats under 10MB."

**Processing:**

- ❌ "Asset processing queued."
- ✅ "Your video is being processed (42% complete). You can continue working and we'll notify you when it's ready."

### API & Development

**Token expired:**

- ❌ "Authentication failed. Token expired."
- ✅ "Your API token expired on March 15. Generate a new token in your project settings." + [Generate Token] button

**Webhook failed:**

- ❌ "Webhook delivery failed."
- ✅ "The webhook to example.com failed 3 consecutive times. Check your endpoint or pause this webhook to stop alerts."

### System & Infrastructure

**Maintenance:**

- ❌ "Service unavailable."
- ✅ "Scheduled maintenance in progress. We're upgrading our system and will be back by 3:00 PM EDT (approximately 20 more minutes)."

**Unexpected downtime:**

- ❌ "Service disruption."
- ✅ "We're experiencing unexpected issues. Our team is working on a fix. Check status.sanity.io for real-time updates."

## Severity Scaling

Match presentation to consequence:

- **Minor**: "Unsaved changes will be automatically saved as a draft." (subtle notification)
- **Moderate**: "The scheduled publish time is in the past. Please select a future time." (highlighted message)
- **Critical**: "Your project is approaching storage limit (98% used). Content uploads will be restricted at 100%." (prominent alert with icon)

## Other Message Types

### Success

Brief, affirming, clear about what succeeded:

- "Page published. Now visible to your audience."
- "Settings saved. Changes take effect immediately."

### Warnings

Alert without alarming, include preventative advice:

- "This action will unpublish 5 related pages. Review the list before confirming."
- "This slug is already in use. Using it will replace the existing page's URL."

### Empty States

- "No comments yet. Comments will appear here once your team adds them."
- "Your media library is empty. Upload images, videos, or documents to get started."

### Confirmations

- "Delete this post? This action can't be undone." [Cancel] [Delete]
- "Publish 'Product Launch' now? It will become visible to your audience immediately." [Schedule for Later] [Publish Now]

## Anti-patterns

Never:

- Blame the user ("You entered the wrong format")
- Use alarming language for recoverable errors ("Fatal error", "Critical failure")
- Be vague ("An unexpected error has occurred")
- Omit next steps ("Error. Please try again.")
- Use passive voice without explaining who should act
