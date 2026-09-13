# Global Architecture Rules: LAN Chat & File Transfer Project

## Core Constraints
* DO NOT use HTTP, REST, or external message brokers for peer-to-peer communication.
* All inter-node communication MUST occur strictly over raw TCP sockets bound to LAN interfaces.
* The system topology is a Hybrid Local-Client-Server. A React frontend communicates via WebSockets to a local backend proxy, which handles all raw TCP networking over the LAN.

## Agent Guidelines
* Always generate an Implementation Plan and Task List for the developer to approve before generating code or executing terminal commands.
