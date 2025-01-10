const { ipcRenderer } = require('electron');
const textInput = document.getElementById('textInput');
const speakButton = document.getElementById('speakButton');
const closeButton = document.getElementById('closeButton');

// Initialize speech synthesis
const synth = window.speechSynthesis;
let voiceSettings = null;

// Handle focus request from main process
ipcRenderer.on('focus-input', () => {
  textInput.focus();
});

// Receive voice settings from main window
ipcRenderer.on('update-voice-settings', (event, settings) => {
  voiceSettings = settings;
});

// Function to get VB-Cable device
async function getVBCableDevice() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find(device => 
      device.kind === 'audiooutput' && 
      (device.label.toLowerCase().includes('cable') || 
       device.label.toLowerCase().includes('vb-audio'))
    );
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return null;
  }
}

// Function to create audio context and connect to VB-Cable
async function createAudioPipeline() {
  const audioContext = new AudioContext();
  const vbCable = await getVBCableDevice();
  
  if (!vbCable) {
    console.warn('VB-Cable not found, using default output');
    return audioContext.destination;
  }

  try {
    // Create a media stream destination
    const destination = audioContext.createMediaStreamDestination();
    
    // Create an audio element for output routing
    const audio = new Audio();
    await audio.setSinkId(vbCable.deviceId);
    audio.srcObject = destination.stream;
    audio.play();
    
    return destination;
  } catch (error) {
    console.error('Error setting up audio pipeline:', error);
    return audioContext.destination;
  }
}

async function speak(text) {
  if (!voiceSettings) return;

  try {
    // Cancel any ongoing speech
    synth.cancel();

    // Create audio pipeline
    const audioDestination = await createAudioPipeline();
    const audioContext = audioDestination.context;

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    
    // Apply settings
    utterance.voice = voices[voiceSettings.voiceIndex];
    utterance.rate = parseFloat(voiceSettings.rate);
    utterance.pitch = parseFloat(voiceSettings.pitch);
    utterance.volume = parseFloat(voiceSettings.volume);

    // Set up audio routing
    utterance.addEventListener('start', (event) => {
      if (event.utterance.audioStream) {
        const source = audioContext.createMediaStreamSource(event.utterance.audioStream);
        source.connect(audioDestination);
      }
    });

    // Clean up after speech
    utterance.addEventListener('end', () => {
      audioContext.close().catch(console.error);
    });

    // Start speaking
    synth.speak(utterance);

  } catch (error) {
    console.error('Error in speak function:', error);
  }
}

// Speak button click handler
speakButton.addEventListener('click', () => {
  const text = textInput.value;
  if (text) {
    speak(text);
    textInput.value = '';
  }
});

// Close button click handler
closeButton.addEventListener('click', () => {
  ipcRenderer.send('toggle-overlay');
});

// Enter key handler
textInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const text = textInput.value;
    if (text) {
      speak(text);
      textInput.value = '';
    }
  }
});

// Escape key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('toggle-overlay');
  }
});

// Request necessary permissions on load
window.addEventListener('load', async () => {
  try {
    // Request audio permissions
    await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Request audio output device permissions
    if (navigator.permissions && navigator.permissions.query) {
      await navigator.permissions.query({ name: 'microphone' });
    }
  } catch (error) {
    console.error('Error requesting permissions:', error);
  }
}); 