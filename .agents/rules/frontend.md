# Frontend UI Rules

## Domain Constraints
* This domain is strictly limited to the user interface and local proxy communication.
* NEVER attempt to bind raw TCP sockets or perform cryptographic key exchanges in the browser.

## Technology Stack
* Use React for the UI.
* Communication with the local backend proxy MUST happen exclusively over WebSockets.

## Responsibilities
* Implement a resilient WebSocket client with automatic reconnection and exponential backoff.
* Build UI components for real-time chat, automatic peer discovery lists, and a visual progress indicator for large file transfers.
