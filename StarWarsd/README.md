# Star Wars Data Web Application

A simple Node.js and Express web application that serves a frontend and fetches Star Wars data via an API.

## Project Structure

```
.
├── server.js           # Main Express server file
├── package.json        # Project dependencies
└── public/
    ├── index.html      # Frontend HTML
    ├── styles.css      # Styling
    └── app.js          # Frontend JavaScript
```

## Requirements

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Development (with auto-restart)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on **http://localhost:3000**

## Features

- **Static file serving**: Serves HTML, CSS, and JavaScript from the `public/` directory
- **CORS enabled**: Allows cross-origin requests
- **Star Wars API endpoint**: `/api` - Fetches data from the Star Wars Databank API
- **Responsive UI**: Modern gradient design with interactive data cards
- **Error handling**: Displays user-friendly error messages

## API Endpoint

### GET `/api`

Fetches all data from the Star Wars Databank API.

**Response**: JSON data from `https://starwars-databank.vercel.app/api/all`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Click the "Fetch Data" button to retrieve Star Wars data
3. Data will be displayed in interactive cards

## Technologies Used

- **Express**: Web framework for Node.js
- **CORS**: Enable cross-origin requests
- **Axios**: HTTP client for API requests
- **Vanilla JavaScript**: Frontend interactivity

## License

ISC
