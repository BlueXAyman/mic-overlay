const textInput = document.getElementById('textInput');
const speakButton = document.getElementById('speakButton');
const closeButton = document.getElementById('closeButton');
const testButton = document.getElementById('testButton');
const voiceSelect = document.getElementById('voiceSelect');
const rateSlider = document.getElementById('rateSlider');
const pitchSlider = document.getElementById('pitchSlider');
const volumeSlider = document.getElementById('volumeSlider');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');

// Initialize speech synthesis
const synth = window.speechSynthesis;
let voices = [];

// Populate voice list
function populateVoiceList() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = voices
    .map((voice, index) => `<option value="${index}">${voice.name} (${voice.lang})</option>`)
    .join('');
}

// Handle voice list loading
populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// Update value displays for sliders
function updateValueDisplay(slider, display) {
  display.textContent = parseFloat(slider.value).toFixed(1);
}

rateSlider.addEventListener('input', () => updateValueDisplay(rateSlider, rateValue));
pitchSlider.addEventListener('input', () => updateValueDisplay(pitchSlider, pitchValue));
volumeSlider.addEventListener('input', () => updateValueDisplay(volumeSlider, volumeValue));

function speak(text) {
  // Cancel any ongoing speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply current settings
  utterance.voice = voices[voiceSelect.value];
  utterance.rate = parseFloat(rateSlider.value);
  utterance.pitch = parseFloat(pitchSlider.value);
  utterance.volume = parseFloat(volumeSlider.value);
  
  synth.speak(utterance);
}

// Speak button click handler
speakButton.addEventListener('click', () => {
  const text = textInput.value;
  if (text) {
    speak(text);
    textInput.value = '';
  }
});

// Test button click handler
testButton.addEventListener('click', () => {
  speak("Blue X Ayman says hello");
});

// Close button click handler
closeButton.addEventListener('click', () => {
  window.close();
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
    window.close();
  }
}); 