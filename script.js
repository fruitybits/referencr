let player;
let currentVideoId = null;
let isPlayerReady = false;
let pendingVideoUrl = null;

window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('youtube-player', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: { playsinline: 1, controls: 1 },
        events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
    });
};

const onPlayerReady = () => {
    isPlayerReady = true;
    if (pendingVideoUrl) {
        handleVideoUrl(pendingVideoUrl);
        pendingVideoUrl = null;
    }
};

const onPlayerError = () => alert('Error loading video. Please check the URL and try again.');

const onPlayerStateChange = event => {
    if (event.data === YT.PlayerState.PLAYING) updateVideoDetails();
};

const updateVideoDetails = () => {
    const { title, video_id } = player.getVideoData();
    player.videoDetails = {
        title,
        thumbnail: `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`
    };
};

const getVideoId = url => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTimestamp = timestamp => {
    const [mins, secs] = timestamp.split(':').map(Number);
    return mins * 60 + secs;
};

const handleVideoUrl = url => {
    const videoId = getVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }

    if (!isPlayerReady) {
        pendingVideoUrl = url;
        return;
    }

    try {
        currentVideoId = videoId;
        player.loadVideoById(videoId);
    } catch {
        alert('Error loading video. Please check the URL and try again.');
    }
};

const savePin = (videoId, title, thumbnail, startTime, endTime, note) => {
    const pins = JSON.parse(localStorage.getItem('soundPins') || '[]');
    pins.push({ id: Date.now(), videoId, title, thumbnail, startTime, endTime, note });
    localStorage.setItem('soundPins', JSON.stringify(pins));
    displayPins();
};

const displayPins = () => {
    const pinsContainer = document.getElementById('pins-container');
    const pins = JSON.parse(localStorage.getItem('soundPins') || '[]');

    pinsContainer.innerHTML = pins.map(({ videoId, title, thumbnail, startTime, endTime, note }) => `
        <div class="pin-card">
            <img class="pin-thumbnail" src="${thumbnail}" alt="${title}">
            <div class="pin-content">
                <div class="pin-title">${title}</div>
                <p class="pin-note">${note}</p>
                <span class="pin-timestamp">${formatTime(startTime)} - ${formatTime(endTime)}</span>
                <button class="play-button" onclick="playPin('${videoId}', ${startTime}, ${endTime})">Play</button>
            </div>
        </div>
    `).join('');
};

window.playPin = (videoId, startTime, endTime) => {
    if (!isPlayerReady) {
        alert('Player not ready. Please try again.');
        return;
    }

    if (currentVideoId !== videoId) {
        player.loadVideoById(videoId, startTime);
        currentVideoId = videoId;
    } else {
        player.seekTo(startTime);
        player.playVideo();
    }

    const checkTime = setInterval(() => {
        if (player.getCurrentTime() >= endTime) {
            player.pauseVideo();
            clearInterval(checkTime);
        }
    }, 100);
};

document.getElementById('youtube-url').addEventListener('input', e => handleVideoUrl(e.target.value));

document.getElementById('save-pin').addEventListener('click', () => {
    if (!currentVideoId || !player.videoDetails) {
        alert('Please wait for the video to start playing before saving');
        return;
    }

    const startTime = parseTimestamp(document.getElementById('start-time').value);
    const endTime = parseTimestamp(document.getElementById('end-time').value);
    const note = document.getElementById('pin-note').value;

    if (isNaN(startTime) || isNaN(endTime)) {
        alert('Please enter valid timestamps (e.g., 1:30)');
        return;
    }

    if (endTime <= startTime) {
        alert('End time must be after start time');
        return;
    }

    const { title, thumbnail } = player.videoDetails;
    savePin(currentVideoId, title, thumbnail, startTime, endTime, note);
});

displayPins();
