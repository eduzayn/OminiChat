// Geração de sons de notificação usando Web Audio API
// Este script gera arquivos de som para diferentes tipos de notificação

// Configuração do AudioContext
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

// Função para gerar tom de notificação padrão
function generateStandardNotification() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // Frequência em Hz (Lá 5)
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Exportar como WAV ou MP3
    // (Esta parte precisaria de uma biblioteca adicional como AudioRecorder)
}

// Função para gerar som para notificação de mídia
function generateMediaNotification() {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.value = 880; // Lá 5
    
    oscillator2.type = 'sine';
    oscillator2.frequency.value = 1046.5; // Dó 6
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start(audioContext.currentTime + 0.15);
    
    oscillator1.stop(audioContext.currentTime + 0.3);
    oscillator2.stop(audioContext.currentTime + 0.45);
}

// Função para gerar som para notificação de áudio
function generateVoiceNotification() {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const oscillator3 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.value = 523.25; // Dó 5
    
    oscillator2.type = 'sine';
    oscillator2.frequency.value = 659.25; // Mi 5
    
    oscillator3.type = 'sine';
    oscillator3.frequency.value = 783.99; // Sol 5
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    oscillator3.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start(audioContext.currentTime + 0.1);
    oscillator3.start(audioContext.currentTime + 0.2);
    
    oscillator1.stop(audioContext.currentTime + 0.3);
    oscillator2.stop(audioContext.currentTime + 0.4);
    oscillator3.stop(audioContext.currentTime + 0.6);
}

// Nota: Para usar este script, você precisa executá-lo em um navegador
// e salvar a saída de áudio. Existem bibliotecas como RecordRTC que 
// permitem gravar o áudio gerado e salvá-lo como arquivos.