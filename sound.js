  window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback, element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();


    // Global Variables for Audio
    var audioContext;

    var sourceNode;
    var analyserNode;
    var javascriptNode;
    var playbackSourceNode;
    var audioStream;
    var array = [];

    var recording = null;  // this is the cumulative buffer for your recording

    var audioBufferNode = null;
    var audioBuffer = null;

    // Global Variables for Drawing
    var x = 0;
    var canvasWidth  = 800;
    var canvasHeight = 256;
    var ctx;


    window.craicAudioContext = (function(){
      return  window.webkitAudioContext || window.AudioContext ;
    })();

    navigator.getMedia = ( navigator.mozGetUserMedia ||
                           navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.msGetUserMedia);

    $(document).ready(function() {
     
        socket.on('audio', function(data)
        {
           console.log("audio data: ",data);
            addSampleToRecording(data);            
        });


        // Check that the browser can handle web audio
        try {
//            audioContext = new webkitAudioContext();
            audioContext = new craicAudioContext();

        }
        catch(e) {
            alert('Web Audio API is not supported in this browser');
        }

        // get the input audio stream and set up the nodes
        try {
            // calls the function setupAudioNodes
//            navigator.webkitGetUserMedia({audio:true}, setupAudioNodes, onError);
            navigator.getMedia({audio:true}, setupAudioNodes, onError);

        } catch (e) {
            alert('webkitGetUserMedia threw exception :' + e);
        }

        // Start recording by setting onaudioprocess to the function that manages the recording buffer
        $("body").on('click', "#start_button",function(e) {
            e.preventDefault();

            // execute every time a new sample has been acquired
            javascriptNode.onaudioprocess = function (e) {
                var bufferArray = Array.prototype.slice.call(e.inputBuffer.getChannelData(0));
                socket.emit("audio", bufferArray);
            }
        });

        // Stop recording by setting onaudioprocess to null
        $("body").on('click', "#stop_button",function(e) {
            e.preventDefault();
            javascriptNode.onaudioprocess = null;
         });

        // Play the recording
        $("body").on('click', "#playback_button",function(e) {
            e.preventDefault();
            playRecording();
         });

        // Reset the recording buffer and the graphics, but keep the nodes connected
        $("body").on('click', "#reset_button",function(e) {
            e.preventDefault();
            recording = null;
            clearCanvas();
         });

        // Disable audio completely
        $("body").on('click', "#disable_audio",function(e) {
            e.preventDefault();
            javascriptNode.onaudioprocess = null;
            if(audioStream)  audioStream.stop();
            if(sourceNode)  sourceNode.disconnect();
         });
    });

    function onError(e) {
        console.log(e);
    }

    function setupAudioNodes(stream) {
        var sampleSize = 1024;  // number of samples to collect before analyzing FFT
                                // decreasing this gives a faster sonogram, increasing it slows it down
        audioStream = stream;

        // The nodes are:  sourceNode -> analyserNode -> javascriptNode -> destination

        // create an audio buffer source node
        sourceNode = audioContext.createMediaStreamSource(audioStream);

        // Set up the javascript node - this uses only one channel - i.e. a mono microphone
        javascriptNode = audioContext.createJavaScriptNode(sampleSize, 1, 1);

        // setup the analyser node
        analyserNode = audioContext.createAnalyser();
        analyserNode.smoothingTimeConstant = 0.0;
        analyserNode.fftSize = 1024; // must be power of two

        // connect the nodes together
        sourceNode.connect(analyserNode);
        analyserNode.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        // optional - connect input to audio output (speaker)
        // This will echo your input back to your speakers - Beware of Feedback !!
        // sourceNode.connect(audioContext.destination);

        // allocate the array for Frequency Data
        array = new Uint8Array(analyserNode.frequencyBinCount);
    }

    // Add this buffer to the recording
    // recording is a global
    function addSampleToRecording(currentBuffer) {
        if (recording ==  null) {
            // handle the first buffer
            recording = currentBuffer;
        } else {
            // allocate a new Float32Array with the updated length
            newlen = recording.length + currentBuffer.length;
            var newBuffer = new Float32Array(newlen);
            newBuffer.set(recording, 0);
            newBuffer.set(currentBuffer, recording.length);
            recording = newBuffer;
        }
    }

    function playRecording() {
        // You need to create the buffer node every time we play the sound
        // Are we able to cleanup that memory or does the footprint grow over time ??
        if ( recording != null ) {
            // create the Buffer from the recording
            audioBuffer = audioContext.createBuffer( 1, recording.length, audioContext.sampleRate );
            audioBuffer.getChannelData(0).set(recording, 0);

            // create the Buffer Node with this Buffer
            audioBufferNode = audioContext.createBufferSource();
            audioBufferNode.buffer = audioBuffer;
            console.log('recording buffer length ' + audioBufferNode.buffer.length.toString());

            // connect the node to the destination and play the audio
            audioBufferNode.connect(audioContext.destination);
            audioBufferNode.noteOn(0);
        }
    }



