# Research Agent Chat Frontend

This README provides information about the frontend part of the Research Agent Chat project, which is built using React. The frontend interface allows users to interact with a multi-modal large language model through text, audio, and image inputs.

## Project Structure

The frontend directory contains the following structure:

```
frontend
├── public
│   └── index.html          # Main HTML file for the React application
├── src
│   ├── App.jsx             # Main component of the React application
│   ├── components
│   │   └── ChatInterface.jsx # Chat interface component
│   └── styles
│       └── App.css         # CSS styles for the application
├── package.json            # npm configuration file
└── README.md               # Documentation for the frontend
```

## Setup Instructions

1. **Install Node.js**: Ensure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).

2. **Navigate to the frontend directory**:
   ```
   cd research-agent-chat/frontend
   ```

3. **Install dependencies**:
   ```
   npm install
   ```

4. **Run the application**:
   ```
   npm start
   ```

   This will start the development server and open the application in your default web browser.

## Usage

The chat interface allows users to:

- **Input Text**: Type messages in the message box.
- **Use Microphone**: Click the microphone button to record audio input.
- **View Transcripts**: The transcript window displays the conversation history.

## Contributing

Contributions to the frontend are welcome! Please follow the standard Git workflow for submitting changes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.