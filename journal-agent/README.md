# Research Agent Chat

This project implements a multi-modal research agent capable of processing image, audio, and text inputs. The application is structured into two main components: a backend service and a frontend interface.

## Project Structure

```
research-agent-chat
├── backend
│   ├── app.py               # FastAPI backend application
│   ├── requirements.txt     # Python dependencies for the backend
│   ├── utils.py            # Utility functions for processing inputs
│   └── Dockerfile          # Docker configuration for backend
├── frontend
│   ├── public
│   │   └── index.html       # Main HTML file for the React application
│   ├── src
│   │   ├── App.jsx          # Main component of the React application
│   │   ├── components
│   │   │   └── ChatInterface.jsx # Chat interface component
│   │   └── styles
│   │       └── App.css      # CSS styles for the React application
│   ├── package.json         # Configuration file for npm
│   ├── README.md            # Documentation for the frontend
│   └── Dockerfile           # Docker configuration for frontend
├── docker-compose.yml       # Docker Compose configuration
├── start.sh                 # Startup script for the application
└── README.md                # Overall documentation for the project
```

## Quick Start with Docker (Recommended)

The easiest way to run the application is using Docker. This method ensures consistent environments and automatic code reload during development.

### Prerequisites
- Docker and Docker Compose installed on your system
- Make sure Docker is running

### Running the Application

1. Clone the repository and navigate to the project directory:
   ```bash
   cd research-agent-chat
   ```

2. Run the startup script:
   ```bash
   ./start.sh
   ```

   Or manually using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

4. To stop the application, press `Ctrl+C` in the terminal or run:
   ```bash
   docker-compose down
   ```

### Development Features
- **Hot Reload**: Changes to your code will automatically be reflected in the running containers
- **Volume Mounting**: Your local code is mounted into the containers, so you can edit files normally
- **Isolated Environment**: Each service runs in its own container with proper networking

## Manual Setup (Alternative)

If you prefer to run the services without Docker:

## Backend Setup

1. Navigate to the `backend` directory.
2. Install the required dependencies using pip:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the backend application:

   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

## Frontend Setup

1. Navigate to the `frontend` directory.
2. Install the required dependencies using npm:

   ```bash
   npm install
   ```

3. Start the frontend application:

   ```bash
   npm start
   ```

## Docker Commands Reference

- **Start the application**: `./start.sh` or `docker-compose up --build`
- **Stop the application**: `Ctrl+C` or `docker-compose down`
- **View logs**: `docker-compose logs -f [service_name]`
- **Rebuild containers**: `docker-compose up --build --force-recreate`
- **Remove containers and volumes**: `docker-compose down -v`

## API Endpoints

- `POST /api/process` - Process multi-modal input (text, image, audio)

## Technology Stack

- **Backend**: FastAPI, Python 3.11
- **Frontend**: React, Node.js 18
- **Containerization**: Docker, Docker Compose
- **Development**: Hot reload enabled for both services

## Usage

Once both the backend and frontend are running, you can interact with the research agent through the chat interface. The interface allows you to input audio, text, and images, which will be processed by the multi-modal large language model.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.