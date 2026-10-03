LeadFlow — PROMPTS.md

1. Plan the LeadFlow architecture from the assignment. Don't code yet.
2. Keep the project in JavaScript, not TypeScript.
3. Confirm the MERN stack and external services we'll use.
4. Set up JWT and bcrypt authentication for the four roles.
5. Add brokerageId to users for tenant isolation.
6. Add auth and role middleware.
7. Create seed data for two brokerages and their users.
8. Check why MongoDB Atlas is not connecting.
   — MongoDB connection was being checked here.
9. Fix the MongoDB connection using the configured environment variables.
   — Credentials/connection settings were adjusted here.
10. Check the MongoDB connection again after the credentials were set.
    — Recheck after the fix.
11. I have already set the MongoDB credentials. Continue and verify the connection.
    — Continued after the credentials were already set.
12. Check the issue shown in the screenshot.
    — Used the screenshot to troubleshoot the current issue.
13. Show me what is completed so far.
14. Build the Lead model and lead CRUD APIs.
15. Make every lead query use the logged-in brokerage.
16. Add the fixed six-stage pipeline.
17. Add the stage-change API for admins and advisors.
18. Add version checking and return 409 for stale updates.
19. Show leads in a simple Kanban pipeline.
20. Add duplicate detection using email or phone.
21. Make duplicate matching case-insensitive and brokerage-specific.
22. Show a clear message when an existing person is found.
23. Fix the client-match duplicate edge case so duplicateOf is only used for an existing lead.
    — The client-match case was inconsistent, so the duplicate logic was fixed without changing normal lead-to-lead matching.
24. Add the inbound lead webhook with a brokerage secret.
25. Queue webhook leads in the MongoDB jobs collection.
26. Add the background worker for lead-ingestion jobs.
27. Add retry handling and save job errors.
28. Add Socket.IO with brokerage-based rooms.
29. Emit lead stage updates only after a successful database update.
30. Refresh the board after a socket reconnect.
31. Add Won-lead to client conversion.
32. Create a client login and link it to the lead/case.
33. Make the client see only their own case.
34. Add client document upload and document listing.
35. Protect document access by client, lead and brokerage.
36. Send uploaded documents to a background checking job.
37. Simulate checking with a delay and occasional failure.
38. Send document status updates through Socket.IO.
39. Build the brokerage dashboard with pipeline counts.
40. Keep dashboard counts limited to the current brokerage.
41. Add email templates with client/advisor placeholders.
42. Queue stage-triggered emails through the existing worker.
43. Check the Mailtrap SMTP setup and email test.
    — Mailtrap setup needed verification before calling email sending complete.
44. I updated the Mailtrap credentials. Restart the worker and run the email test again.
    — After the SMTP credentials were changed, the worker was restarted and the test was run again.
45. Add task rules and automatic task creation on stage entry.
46. Add task completion and overdue task display.
47. Connect Tally to the existing LeadFlow webhook.
48. Map Tally name, email and phone fields to LeadFlow.
49. Verify repeated Tally submissions do not create duplicate active leads.
50. Move document storage from local disk to Cloudinary.
51. I added the Cloudinary credentials. Check the upload setup again.
    — Cloudinary credentials were added manually, then the setup was checked again.
52. Polish the UI, clean up the Login page, audit the project and prepare the README, PROMPTS.md and final submission.
