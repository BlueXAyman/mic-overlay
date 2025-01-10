const { ipcRenderer } = require('electron');
const Store = require('electron-store');

// Voice-related elements
const voiceSelect = document.getElementById('voiceSelect');
const rateSlider = document.getElementById('rateSlider');
const pitchSlider = document.getElementById('pitchSlider');
const volumeSlider = document.getElementById('volumeSlider');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const saveVoiceSettings = document.getElementById('saveVoiceSettings');

// Window control elements
const minimizeButton = document.getElementById('minimizeButton');
const quitButton = document.getElementById('quitButton');

// Shortcut handling
const shortcutInput = document.getElementById('shortcutInput');
const saveShortcut = document.getElementById('saveShortcut');
const clearShortcut = document.getElementById('clearShortcut');
const startButton = document.getElementById('startButton');

// Initialize speech synthesis
const synth = window.speechSynthesis;
let voices = [];
const store = new Store();

// System check elements
const vbStatus = document.getElementById('vbStatus');
const vbIcon = document.getElementById('vbIcon');
const vbInstallGuide = document.getElementById('vbInstallGuide');

// Window controls
minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

quitButton.addEventListener('click', () => {
  ipcRenderer.send('quit-app');
});

// Voice settings
function populateVoiceList() {
  voices = synth.getVoices();
  if (voices.length > 0) {
    voiceSelect.innerHTML = voices
      .map((voice, index) => `<option value="${index}">${voice.name} (${voice.lang})</option>`)
      .join('');
  }
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

function updateValueDisplay(slider, display) {
  display.textContent = parseFloat(slider.value).toFixed(1);
}

rateSlider.addEventListener('input', () => updateValueDisplay(rateSlider, rateValue));
pitchSlider.addEventListener('input', () => updateValueDisplay(pitchSlider, pitchValue));
volumeSlider.addEventListener('input', () => updateValueDisplay(volumeSlider, volumeValue));

// Save voice settings button
saveVoiceSettings.addEventListener('click', () => {
  if (!voiceSelect.value) {
    alert('Please select a voice first');
    return;
  }

  const voiceSettings = {
    voiceIndex: voiceSelect.value,
    rate: rateSlider.value,
    pitch: pitchSlider.value,
    volume: volumeSlider.value
  };

  store.set('voiceSettings', voiceSettings);
  ipcRenderer.send('update-voice-settings', voiceSettings);
  alert('Voice settings saved successfully!');
});

// Shortcut handling
let currentKeys = new Set();
let isRecordingShortcut = false;

shortcutInput.addEventListener('click', () => {
  shortcutInput.value = '';
  currentKeys.clear();
  isRecordingShortcut = true;
  shortcutInput.placeholder = 'Press keys...';
});

document.addEventListener('keydown', (e) => {
  if (!isRecordingShortcut) return;
  e.preventDefault();
  
  currentKeys.add(e.key);
  shortcutInput.value = Array.from(currentKeys).join('+');
});

document.addEventListener('keyup', (e) => {
  if (!isRecordingShortcut) return;
  
  if (currentKeys.size >= 2) {
    isRecordingShortcut = false;
    shortcutInput.placeholder = 'Click to set shortcut...';
  }
});

clearShortcut.addEventListener('click', () => {
  shortcutInput.value = '';
  currentKeys.clear();
});

saveShortcut.addEventListener('click', () => {
  if (currentKeys.size < 2) {
    alert('Please set a shortcut with at least 2 keys');
    return;
  }

  const shortcut = Array.from(currentKeys).join('+');
  store.set('shortcut', shortcut);
  ipcRenderer.send('update-shortcut', shortcut);
  alert('Hotkey saved successfully!');
});

// Start service button
startButton.addEventListener('click', async () => {
  if (!await checkVBCable()) {
    alert('VB-Cable is required but not installed. Please install it first.');
    return;
  }

  if (currentKeys.size < 2) {
    alert('Please set a shortcut with at least 2 keys');
    return;
  }

  if (!voiceSelect.value) {
    alert('Please wait for voices to load and select one');
    return;
  }

  const shortcut = Array.from(currentKeys).join('+');
  const voiceSettings = {
    voiceIndex: voiceSelect.value,
    rate: rateSlider.value,
    pitch: pitchSlider.value,
    volume: volumeSlider.value
  };

  store.set('voiceSettings', voiceSettings);
  ipcRenderer.send('start-service', shortcut, voiceSettings);
  startButton.textContent = 'Service Running';
  startButton.disabled = true;
});

// VB-Cable check
async function checkVBCable() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const vbCableFound = devices.some(device => 
      device.label.toLowerCase().includes('vb-audio') || 
      device.label.toLowerCase().includes('cable input')
    );

    if (vbCableFound) {
      vbStatus.textContent = 'VB-Cable: Installed';
      vbIcon.textContent = '✅';
      vbIcon.style.color = '#4CAF50';
      vbInstallGuide.style.display = 'none';
    } else {
      vbStatus.textContent = 'VB-Cable: Not Found';
      vbIcon.textContent = '❌';
      vbIcon.style.color = '#f44336';
      vbInstallGuide.style.display = 'block';
    }

    return vbCableFound;
  } catch (error) {
    console.error('Error checking audio devices:', error);
    vbStatus.textContent = 'VB-Cable: Check Failed';
    vbIcon.textContent = '⚠️';
    vbIcon.style.color = '#ff9800';
    vbInstallGuide.style.display = 'block';
    return false;
  }
}

// Load saved settings
ipcRenderer.on('load-saved-settings', (event, savedSettings) => {
  if (savedSettings) {
    if (savedSettings.shortcut) {
      currentKeys = new Set(savedSettings.shortcut.split('+'));
      shortcutInput.value = savedSettings.shortcut;
    }

    if (savedSettings.voiceSettings) {
      const vs = savedSettings.voiceSettings;
      
      function setVoiceSettings() {
        if (voices.length > 0) {
          voiceSelect.value = vs.voiceIndex;
          rateSlider.value = vs.rate;
          pitchSlider.value = vs.pitch;
          volumeSlider.value = vs.volume;
          
          updateValueDisplay(rateSlider, rateValue);
          updateValueDisplay(pitchSlider, pitchValue);
          updateValueDisplay(volumeSlider, volumeValue);
          
          startButton.click();
        } else {
          setTimeout(setVoiceSettings, 100);
        }
      }
      
      setVoiceSettings();
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    checkVBCable();
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    vbStatus.textContent = 'Please allow audio permissions';
    vbIcon.textContent = '⚠️';
    vbIcon.style.color = '#ff9800';
  }
});

// Add with other button references
const zoomInButton = document.getElementById('zoomInButton');
const zoomOutButton = document.getElementById('zoomOutButton');

// Add with other event listeners
zoomInButton.addEventListener('click', () => {
  ipcRenderer.send('zoom-in');
});

zoomOutButton.addEventListener('click', () => {
  ipcRenderer.send('zoom-out');
}); 