"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const LOBBY_TTL = 24 * 60 * 60 * 1000; // 24 hours
function initSocket(io) {
    const lobbies = new Map();
    // cleanup expired lobbies
    setInterval(() => {
        const now = Date.now();
        lobbies.forEach((lobby, lobbyId) => {
            if (now - lobby.createdAt > LOBBY_TTL) {
                io.to(lobbyId).emit('lobby-closed');
                lobbies.delete(lobbyId);
                console.log(`Lobby expired: ${lobbyId}`);
            }
        });
    }, 60 * 60 * 1000);
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('create-lobby', (data) => {
            try {
                if (!data?.userName?.trim()) {
                    socket.emit('error', { message: 'Username is required' });
                    return;
                }
                const lobbyId = generateLobbyId(lobbies);
                const lobby = {
                    id: lobbyId,
                    name: data.gameName?.trim() || undefined,
                    host: socket.id,
                    users: [{
                            id: socket.id,
                            name: data.userName.trim().substring(0, 50),
                            vote: null,
                            isObserver: false
                        }],
                    currentStory: null,
                    votesRevealed: false,
                    createdAt: Date.now(),
                    currentIssue: null,
                    issues: []
                };
                lobbies.set(lobbyId, lobby);
                socket.join(lobbyId);
                socket.emit('lobby-created', { lobbyId, lobby });
                console.log(`Lobby created: ${lobbyId}`);
            }
            catch (err) {
                console.error('Error creating lobby:', err);
                socket.emit('error', { message: 'Failed to create lobby' });
            }
        });
        socket.on('join-lobby', (data) => {
            try {
                const { lobbyId, userName } = data || {};
                if (!lobbyId || !userName?.trim()) {
                    socket.emit('error', { message: 'Lobby ID and username are required' });
                    return;
                }
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby) {
                    socket.emit('error', { message: 'Lobby not found' });
                    return;
                }
                if (lobby.users.some(u => u.id === socket.id)) {
                    socket.emit('lobby-joined', { lobby });
                    return;
                }
                const user = {
                    id: socket.id,
                    name: userName.trim().substring(0, 50),
                    vote: null,
                    isObserver: false
                };
                lobby.users.push(user);
                socket.join(canonicalId);
                socket.emit('lobby-joined', { lobby });
                socket.to(canonicalId).emit('user-joined', { user });
                console.log(`${user.name} joined lobby: ${canonicalId}`);
            }
            catch (err) {
                console.error('Error joining lobby:', err);
                socket.emit('error', { message: 'Failed to join lobby' });
            }
        });
        socket.on('submit-vote', (data) => {
            try {
                const { lobbyId, vote } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby || lobby.votesRevealed)
                    return;
                const user = lobby.users.find(u => u.id === socket.id);
                if (user) {
                    user.vote = String(vote).substring(0, 10);
                    io.to(canonicalId).emit('vote-submitted', {
                        userId: socket.id,
                        hasVoted: true
                    });
                }
            }
            catch (err) {
                console.error('Error submitting vote:', err);
            }
        });
        socket.on('reveal-votes', (data) => {
            try {
                const { lobbyId } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                lobby.votesRevealed = true;
                io.to(canonicalId).emit('votes-revealed', {
                    users: lobby.users.map(u => ({
                        id: u.id,
                        name: u.name,
                        vote: u.vote
                    }))
                });
            }
            catch (err) {
                console.error('Error revealing votes:', err);
            }
        });
        socket.on('new-round', (data) => {
            try {
                const { lobbyId, story } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                lobby.users.forEach(u => u.vote = null);
                lobby.currentStory = story ? String(story).substring(0, 500) : null;
                lobby.votesRevealed = false;
                io.to(canonicalId).emit('round-started', {
                    story: lobby.currentStory,
                    users: lobby.users.map(u => ({
                        id: u.id,
                        name: u.name,
                        vote: null
                    })),
                    currentIssue: lobby.currentIssue,
                    issues: lobby.issues
                });
            }
            catch (err) {
                console.error('Error starting new round:', err);
            }
        });
        socket.on('start-countdown', (data) => {
            try {
                const { lobbyId } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                if (lobby.host !== socket.id)
                    return;
                io.to(canonicalId).emit('countdown-started');
                console.log(`Countdown started in lobby: ${canonicalId}`);
            }
            catch (err) {
                console.error('Error starting countdown:', err);
            }
        });
        socket.on('select-issue', (data) => {
            try {
                const { lobbyId, issue } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                if (lobby.host !== socket.id)
                    return;
                lobby.currentIssue = issue;
                io.to(canonicalId).emit('issue-selected', { issue });
                console.log(`Issue selected in lobby: ${canonicalId}`);
            }
            catch (err) {
                console.error('Error selecting issue:', err);
            }
        });
        socket.on('update-issues', (data) => {
            try {
                const { lobbyId, issues } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                if (lobby.host !== socket.id)
                    return;
                lobby.issues = issues;
                io.to(canonicalId).emit('issues-updated', { issues });
                console.log(`Issues updated in lobby: ${canonicalId}`);
            }
            catch (err) {
                console.error('Error updating issues:', err);
            }
        });
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            lobbies.forEach((lobby, lobbyId) => {
                const userIndex = lobby.users.findIndex(u => u.id === socket.id);
                if (userIndex !== -1) {
                    const user = lobby.users[userIndex];
                    lobby.users.splice(userIndex, 1);
                    socket.to(lobbyId).emit('user-left', { userId: socket.id, userName: user.name });
                    if (lobby.users.length === 0) {
                        lobbies.delete(lobbyId);
                        console.log(`Lobby closed (empty): ${lobbyId}`);
                    }
                    else if (lobby.host === socket.id) {
                        lobby.host = lobby.users[0].id;
                        console.log(`Host transferred in lobby: ${lobbyId}`);
                    }
                }
            });
        });
        socket.on('get-lobby', (data) => {
            try {
                const { lobbyId } = data || {};
                if (!lobbyId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (lobby) {
                    socket.emit('lobby-info', { lobby });
                }
                else {
                    socket.emit('error', { message: 'Lobby not found' });
                }
            }
            catch (err) {
                console.error('Error getting lobby:', err);
            }
        });
        socket.on('kick-user', (data) => {
            try {
                const { lobbyId, userId } = data || {};
                if (!lobbyId || !userId)
                    return;
                const canonicalId = String(lobbyId).toUpperCase();
                const lobby = lobbies.get(canonicalId);
                if (!lobby)
                    return;
                if (lobby.host !== socket.id) {
                    socket.emit('error', { message: 'Only the host can kick users' });
                    return;
                }
                if (userId === socket.id) {
                    socket.emit('error', { message: 'Cannot kick yourself' });
                    return;
                }
                const userIndex = lobby.users.findIndex(u => u.id === userId);
                if (userIndex === -1)
                    return;
                const kickedUser = lobby.users[userIndex];
                lobby.users.splice(userIndex, 1);
                io.to(userId).emit('kicked', { lobbyId: canonicalId });
                io.to(canonicalId).emit('user-left', { userId, userName: kickedUser.name });
                socket.emit('lobby-updated', { lobby });
                console.log(`${kickedUser.name} was kicked from lobby: ${canonicalId}`);
            }
            catch (err) {
                console.error('Error kicking user:', err);
            }
        });
    });
    function generateLobbyId(map) {
        let id;
        do {
            id = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (map.has(id));
        return id;
    }
}
