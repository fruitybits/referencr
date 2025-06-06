let player;
let soundcloudPlayer;
let currentVideoId = null;
let currentSoundCloudUrl = null;
let isPlayerReady = false;
let isSoundCloudReady = false;
let pendingUrl = null;

window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('youtube-player', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: { playsinline: 1, controls: 1 },
        events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
    });
};

const initSoundCloudPlayer = () => {
    const iframe = document.getElementById('soundcloud-player');
    soundcloudPlayer = SC.Widget(iframe);
    soundcloudPlayer.bind(SC.Widget.Events.READY, () => {
        isSoundCloudReady = true;
        if (pendingUrl?.includes('soundcloud.com')) {
            handleUrl(pendingUrl);
        }
    });
};

initSoundCloudPlayer();

const onPlayerReady = () => {
    isPlayerReady = true;
    if (pendingUrl?.includes('youtube')) {
        handleUrl(pendingUrl);
    }
};

const onPlayerError = () => alert('Error loading media. Please check the URL and try again.');

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

const getUrlType = url => {
    if (url.includes('youtube')) return 'youtube';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    return null;
};

const getVideoId = url => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const getSoundCloudTimestamp = url => {
    const timestampMatch = url.match(/#t=(\d{1,2}:)?(\d{1,2}:\d{2})/);
    if (!timestampMatch) return 0;

    const timestamp = timestampMatch[2];
    const [minutes, seconds] = timestamp.split(':').map(Number);
    return minutes * 60 + seconds;
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

const handleUrl = url => {
    if (url.includes('youtube')) {
        const videoId = getVideoId(url);
        if (!videoId) {
            alert('Invalid YouTube URL');
            return;
        }

        if (!isPlayerReady) {
            pendingUrl = url;
            return;
        }

        try {
            document.getElementById('youtube-player').style.display = 'block';
            document.getElementById('soundcloud-player').style.display = 'none';
            currentVideoId = videoId;
            currentSoundCloudUrl = null;
            player.loadVideoById(videoId);
        } catch {
            alert('Error loading video. Please check the URL and try again.');
        }
    } else if (url.includes('soundcloud.com')) {
        if (!isSoundCloudReady) {
            pendingUrl = url;
            return;
        }

        try {
            document.getElementById('youtube-player').style.display = 'none';
            document.getElementById('soundcloud-player').style.display = 'block';
            currentVideoId = null;
            currentSoundCloudUrl = url;

            soundcloudPlayer.load(url, {
                callback: () => {
                    soundcloudPlayer.getCurrentSound(sound => {
                        soundcloudPlayer.videoDetails = {
                            title: sound.title,
                            thumbnail: sound.artwork_url || sound.user.avatar_url
                        };
                    });
                }
            });
        } catch {
            alert('Error loading SoundCloud track. Please check the URL and try again.');
        }
    } else {
        alert('Invalid URL. Please use a YouTube, YouTube Music, or SoundCloud URL');
    }
};

const savePin = (id, type, title, thumbnail, startTime, endTime, note, tag) => {
    const pins = JSON.parse(localStorage.getItem('soundPins') || '[]');
    pins.unshift({
        id: Date.now(),
        mediaId: id,
        type,
        title,
        thumbnail,
        startTime,
        endTime,
        note,
        tag
    });
    localStorage.setItem('soundPins', JSON.stringify(pins));
    displayPins();
};

const displayPins = () => {
    const pinsContainer = document.getElementById('pins-container');
    const pins = JSON.parse(localStorage.getItem('soundPins') || '[]');

    pinsContainer.innerHTML = pins.map(({ mediaId, type, title, thumbnail, startTime, endTime, note, tag }) => `
        <div class="pin-card">
            ${tag ? `<div class="pin-tag" data-tag="${tag}">${tag}</div>` : ''}
            <img class="pin-thumbnail" src="${thumbnail}" alt="${title}">
            <div class="pin-content">
                <div class="pin-title">${title}</div>
                <div class="pin-source">${type === 'youtube' ? 'YouTube' : 'SoundCloud'}</div>
                <span class="pin-timestamp">${formatTime(startTime)} - ${formatTime(endTime)}</span>
                ${note ? `<p class="pin-note">${note}</p>` : ''}
                <button class="play-button" onclick="playPin('${mediaId}', '${type}', ${startTime}, ${endTime})">Play Clip</button>
            </div>
        </div>
    `).join('');
};

window.playPin = (mediaId, type, startTime, endTime) => {
    if (type === 'youtube') {
        if (!isPlayerReady) {
            alert('YouTube player not ready. Please try again.');
            return;
        }

        // Only pause SoundCloud if it's playing
        if (soundcloudPlayer) {
            soundcloudPlayer.pause();
        }

        document.getElementById('youtube-player').style.display = 'block';
        document.getElementById('soundcloud-player').style.display = 'none';

        if (currentVideoId !== mediaId) {
            player.loadVideoById(mediaId, startTime);
            currentVideoId = mediaId;
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
    } else {
        if (!isSoundCloudReady) {
            alert('SoundCloud player not ready. Please try again.');
            return;
        }

        // Only pause YouTube if it's playing
        if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        }

        document.getElementById('youtube-player').style.display = 'none';
        document.getElementById('soundcloud-player').style.display = 'block';

        soundcloudPlayer.load(mediaId, {
            callback: () => {
                soundcloudPlayer.seekTo(startTime * 1000);
                soundcloudPlayer.play();

                const checkTime = setInterval(() => {
                    soundcloudPlayer.getPosition(position => {
                        if (position >= endTime * 1000) {
                            soundcloudPlayer.pause();
                            clearInterval(checkTime);
                        }
                    });
                }, 100);
            }
        });
    }
};

document.getElementById('url-input').addEventListener('change', e => handleUrl(e.target.value));
document.getElementById('url-input').addEventListener('paste', e => {
    // Use timeout to prevent constant alerts
    setTimeout(() => handleUrl(e.target.value), 0);
});

document.getElementById('save-pin').addEventListener('click', () => {
    if (!currentVideoId && !currentSoundCloudUrl) {
        alert('Please wait for the media to start playing before saving');
        return;
    }

    const startTimeInput = document.getElementById('start-time').value;
    const endTimeInput = document.getElementById('end-time').value;

    if (!startTimeInput || !endTimeInput) {
        alert('Please enter both start and end times');
        return;
    }

    const startTime = parseTimestamp(startTimeInput);
    const endTime = parseTimestamp(endTimeInput);

    if (isNaN(startTime) || isNaN(endTime)) {
        alert('Please enter valid timestamps (e.g., 1:30)');
        return;
    }

    if (endTime <= startTime) {
        alert('End time must be after start time');
        return;
    }

    const note = document.getElementById('pin-note').value;
    const tag = document.getElementById('pin-tag').value.trim();

    const validateAndSave = (duration) => {
        if (endTime > duration) {
            alert(`End time cannot be greater than the media duration (${formatTime(duration)})`);
            return;
        }

        if (currentVideoId) {
            const { title, thumbnail } = player.videoDetails;
            savePin(currentVideoId, 'youtube', title, thumbnail, startTime, endTime, note, tag);
        } else {
            const { title, thumbnail } = soundcloudPlayer.videoDetails;
            savePin(currentSoundCloudUrl, 'soundcloud', title, thumbnail, startTime, endTime, note, tag);
        }
    };

    if (currentVideoId) {
        validateAndSave(player.getDuration());
    } else {
        soundcloudPlayer.getDuration(duration => validateAndSave(duration / 1000));
    }
});

displayPins();
