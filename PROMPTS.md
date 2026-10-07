LeadFlow — PROMPTS.md

1. first plan the leadflow architecture from the assignment, dont code yet
2. use javascript only, dont use typescript
3. tell me the tech stack and what external tools we are using
4. setup jwt and bcrypt auth for all 4 roles
5. add brokerageId in user so each brokerage data stays separate
6. add auth middleware and role based middleware
7. create seed data for 2 brokerages and users for both
8. check why my mongodb atlas is not connecting
   - mongo connection was being checked here

9. fix the mongo connection using the env values
   - credentials/connection settings were updated here

10. check the mongo connection again after setting the credentials

11. i already set the mongodb credentials, continue and verify the connection

12. check this issue from the screenshot

13. show me what we have completed till now
14. create lead model and the basic crud apis
15. make sure every lead query only gets leads from the logged in brokerage
16. add the fixed 6 stage pipeline
17. add api for changing stages for admin and advisor
18. add version check and return 409 if someone is updating an old version
19. show the leads in a simple kanban board
20. add duplicate check using email or phone
21. duplicate check should ignore upper/lower case and stay inside same brokerage
22. show a clear message if this person already exists
23. duplicateOf is pointing to client in one case, fix that so it only points to an existing lead

- client duplicate case was inconsistent, fixed without changing normal lead matching

24. add incoming lead webhook with brokerage secret
25. put webhook leads into mongodb jobs collection first
26. now add worker which picks the lead ingestion jobs
27. add retry handling and save the error if a job fails
28. add socket io and make rooms based on brokerage
29. emit stage update only after database update is successful
30. after socket reconnect refresh the board
31. when a lead becomes won add conversion to client
32. create client login and link it with the lead/case
33. client should only be able to see their own case
34. add client document upload and document list
35. make sure docs are protected by client, lead and brokerage
36. upload documents and send them to background checking job
37. simulate document checking with some delay and sometimes fail it
38. send document status updates using socket io
39. build dashboard with pipeline counts
40. dashboard counts should only be for the logged in brokerage
41. add email templates with client and advisor placeholders
42. queue the stage based emails through the worker
43. check mailtrap smtp setup and test if email is actually going

- mailtrap setup needed another verification before calling it complete

44. i updated the mailtrap credentials, restart worker and test email again

- after changing smtp credentials the worker was restarted and email test was run again

45. add task rules and automatically create tasks when stage changes
46. add task completion and overdue task display
47. connect tally form with our existing webhook
48. map tally name email and phone into lead fields
49. check repeated tally submissions and make sure duplicate active leads are not created
50. move document upload storage from local disk to cloudinary
51. i added the cloudinary credentials, check the upload setup again

- cloudinary credentials were added manually and setup was checked again

52. polish the ui, clean up login page, audit the project and prepare readme, prompts and final submission
53. check all frontend and backend production urls and replace localhost api/socket references with render url

- vercel login was failing because render cors was still using localhost

54. fix production cors and set CLIENT_ORIGIN to the vercel frontend url

- after this, requests from vercel could reach render

55. verify tally webhook on deployed backend and tell me the exact tally setup
56. webhook is delivered but riya lead is not showing in leadflow, check why

- webhook job was pending because production worker was not running

57. separate render background worker is paid, run the existing worker in the same free web service
58. verify the full production tally flow and confirm the lead gets created

- riya appeared in leadflow with source tally
