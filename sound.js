    // Global Variables for Audio
    var audioContext;

    var sourceNode;
    var javascriptNode;
    var audioStream;

    window.craicAudioContext = (function(){
      return  window.webkitAudioContext || window.AudioContext ;
    })();

    navigator.getMedia = ( navigator.mozGetUserMedia ||
                           navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.msGetUserMedia);

    $(document).ready(function() {
     
        socket.on('audio',playSound);

        try {
            audioContext = new craicAudioContext();

        }
        catch(e) {
            alert('Web Audio API is not supported in this browser');
        }

        // get the input audio stream and set up the nodes
        try {
            navigator.getMedia({audio:true}, setupAudioNodes, onError);

        } catch (e) {
            alert('webkitGetUserMedia threw exception :' + e);
        }

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
        var sampleSize = 16384;  // number of samples to collect before analyzing FFT
                                // decreasing this gives a faster sonogram, increasing it slows it down
        audioStream = stream;

        // The nodes are:  sourceNode -> analyserNode -> javascriptNode -> destination

        // create an audio buffer source node
        sourceNode = audioContext.createMediaStreamSource(audioStream);

        // Set up the javascript node - this uses only one channel - i.e. a mono microphone
        javascriptNode = audioContext.createJavaScriptNode(sampleSize, 1, 1);

        // connect the nodes together
        sourceNode.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
    }


    function playSound(receivedBuffer) {
        var audioBufferNode = null;
        var audioBuffer = null;

        var recording = new Float32Array(receivedBuffer);

        if ( recording != null ) {
            // create the Buffer from the recording
            audioBuffer = audioContext.createBuffer( 1, recording.length, audioContext.sampleRate );
            audioBuffer.getChannelData(0).set(recording, 0);

            // create the Buffer Node with this Buffer
            audioBufferNode = audioContext.createBufferSource();
            audioBufferNode.buffer = audioBuffer;
            console.log('recording buffer length ' + audioBufferNode.buffer.length);

            // connect the node to the destination and play the audio
            audioBufferNode.connect(audioContext.destination);
            audioBufferNode.start(0);
        }
    }



