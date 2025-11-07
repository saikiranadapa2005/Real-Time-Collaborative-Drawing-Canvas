# Real-Time-Collaborative-Drawing-Canvas
# Real-Time Collaborative Drawing Canvas

## Setup Instructions

1. **Clone the repository**  
git clone <your-github-repo-url>
cd collaborative-canvas

text

2. **Install dependencies**  
npm install

text

3. **Start the server**  
npm start

text
Or, if you don’t have a `start` script set up:
node server/server.js

text

4. **Open the app in your browser**  
Go to:
http://localhost:3000

text

## How to Test with Multiple Users

- Open multiple browser tabs or use different browsers, all navigating to `http://172.29.16.244:3000/`.
- Each tab simulates a different user.
- Try drawing, erasing, undo/redo, changing brush size/color.  
- Each user's cursor/location is visible to others.
- Undo/redo affects the global operation history for all users.

## Known Limitations/Bugs

- No authentication: Any connected tab is treated as a distinct user.
- No persistent storage: Canvas resets if server restarts or if page is refreshed.
- If multiple users draw at the exact same pixel simultaneously, tiny artifacts may appear.
- Performance may degrade with hundreds of simultaneous users (designed for 5–20 users).
- Mobile touch support is limited (considered for future improvements).

## Time Spent on Project

- Total time spent: **~10 hours**
- Backend/server: 4 hours
- Frontend/canvas logic: 4 hours
- Documentation and testing: 2 hours
