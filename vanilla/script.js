import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";
// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([
    { client: 'Chrome' },
]);

function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}
const controls = window;
const mpHolistic = window;
const drawingUtils = window;
const config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@` +
            `${mpHolistic.VERSION}/${file}`;
    } };
// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
function removeElements(landmarks, elements) {
    for (const element of elements) {
        delete landmarks[element];
    }
}
function removeLandmarks(results) {
    if (results.poseLandmarks) {
        removeElements(results.poseLandmarks, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22]);
    }
}

function findHandPosition(rightHandLandmarks) {
    if (rightHandLandmarks) {
        const wrist = rightHandLandmarks[0];
        const thumb = rightHandLandmarks[4];
        const index = rightHandLandmarks[8];
        const middle = rightHandLandmarks[12];
        const ring = rightHandLandmarks[16];
        const pinky = rightHandLandmarks[20];

        const indexBase = rightHandLandmarks[5];
        const pinkyBase = rightHandLandmarks[17];

        const handCenter = {
            x: (wrist.x + indexBase.x + pinkyBase.x ) / 3,
            y: (wrist.y + indexBase.y + pinkyBase.y ) / 3,
            z: (wrist.z + indexBase.z + pinkyBase.z ) / 3,
        }
        const screenWrist = {
            x: wrist.x * canvasElement.width,
            y: wrist.y * canvasElement.height,
        }
        const screenHandCenter = {
            x: handCenter.x * canvasElement.width,
            y: handCenter.y * canvasElement.height,
        }
        const screenThumb = {
            x: thumb.x * canvasElement.width,
            y: thumb.y * canvasElement.height,
        }
        const screenIndex = {
            x: index.x * canvasElement.width,
            y: index.y * canvasElement.height,
        }
        const screenMiddle = {
            x: middle.x * canvasElement.width,
            y: middle.y * canvasElement.height,
        }
        const screenRing = {
            x: ring.x * canvasElement.width,
            y: ring.y * canvasElement.height,
        }
        const screenPinky = {
            x: pinky.x * canvasElement.width,
            y: pinky.y * canvasElement.height,
        }
        const screenRadioImage = Math.sqrt(
          Math.pow((screenHandCenter.x - screenWrist.x),2)
          + Math.pow((screenHandCenter.y - screenWrist.y), 2)
        );

        let hand_number = 0;
        if(screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenThumb.x - screenHandCenter.x), 2)
          + Math.pow((screenThumb.y - screenHandCenter.y), 2))){
            hand_number += 5;
        }
        if(screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenIndex.x - screenHandCenter.x), 2)
          + Math.pow((screenIndex.y - screenHandCenter.y), 2))){
            hand_number += 1;
        }
        if(screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenMiddle.x - screenHandCenter.x), 2)
          + Math.pow((screenMiddle.y - screenHandCenter.y), 2))){
            hand_number += 1;
        }
        if(screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenRing.x - screenHandCenter.x), 2)
          + Math.pow((screenRing.y - screenHandCenter.y), 2))){
            hand_number += 1;
        }
        if(screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenPinky.x - screenHandCenter.x), 2)
          + Math.pow((screenPinky.y - screenHandCenter.y), 2))){
            hand_number += 1;
        }
        return hand_number;

    }
}


let activeEffect = 'mask';
let randomNumber = 0;
let lastRandomNumber = randomNumber;
let activeDifficulty = 'easy';
let easyCountdownDirection = 1;
let countCorrectAnswers = 0;
let startTime = Date.now();
let operationSpeed = 0;
let averageTime = 0;

function onResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');
    // Remove landmarks we don't want to draw.
    removeLandmarks(results);
    // Update the frame rate.
    // fpsControl.tick();
    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.segmentationMask) {
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
        // Only overwrite existing pixels.
        if (activeEffect === 'mask' || activeEffect === 'both') {
            canvasCtx.globalCompositeOperation = 'source-in';
            // This can be a color or a texture or whatever...
            canvasCtx.fillStyle = '#00FF007F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        else {
            canvasCtx.globalCompositeOperation = 'source-out';
            canvasCtx.fillStyle = 'rgb(59,255,0)';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-over';
    }
    else {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }
    canvasCtx.lineWidth = 25;

    let hands_number = 0;
    if(results.leftHandLandmarks){
        hands_number += findHandPosition(results.leftHandLandmarks);
    }
    if(results.rightHandLandmarks){
        hands_number += findHandPosition(results.rightHandLandmarks) * 10;
    }
    const color = hands_number === randomNumber ? 'green' : 'red';
    if( hands_number === randomNumber ) {
        drawingUtils.drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, { color: color });
        drawingUtils.drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, { color: color });

    }

    canvasCtx.font = '80px Arial';
    if(lastRandomNumber === hands_number) {
        canvasCtx.fillStyle = 'green';
    } else {
        canvasCtx.fillStyle = 'red';
    }

    canvasCtx.fillText(`Your hands now: ${hands_number}`, canvasElement.width / 2 - 300, canvasElement.height / 2, 800,);

    canvasCtx.fillStyle = 'orange';

    canvasCtx.font = '70px Arial';
    canvasCtx.textAlign = 'center';

    // canvasCtx.fillText(`Try: ${randomNumber}`, canvasElement.width / 2 - 300, canvasElement.height / 2 - 100, 800);

    let screenNumber;
    let screenNumberMessage;

    if(activeDifficulty === 'hard') {
        screenNumber = randomNumber - lastRandomNumber;
        screenNumberMessage = `(${lastRandomNumber})    ${screenNumber > 0 ? `+${screenNumber}` : screenNumber} ` ;
    }
    else {
        screenNumber = randomNumber;
        screenNumberMessage = `${screenNumber > 0 ? `+${screenNumber}` : screenNumber} ` ;
    }

    canvasCtx.fillText(screenNumberMessage, canvasElement.width / 2 - 300, canvasElement.height / 2 - 100, 800);


    if(hands_number === randomNumber) {
        countCorrectAnswers += 1;

        operationSpeed =  ((Date.now() - startTime) / countCorrectAnswers) / 1000;
        startTime = Date.now();

        averageTime = Number((averageTime * countCorrectAnswers + operationSpeed ) / (countCorrectAnswers + 1)).toFixed(2);
        operationSpeed = Number(operationSpeed).toFixed(2);
    }

    canvasCtx.font = '60px Arial';
    canvasCtx.fillStyle = 'green';
    canvasCtx.fillText(`Points : ${countCorrectAnswers}`, canvasElement.width / 2 , canvasElement.height / 2 + 200, 800);

    canvasCtx.font = '40px Arial';
    canvasCtx.fillStyle = 'green';
    canvasCtx.fillText(`Level : ${activeDifficulty}`, canvasElement.width / 2 , canvasElement.height / 2 + 300, 800);
    canvasCtx.fillText(`Avg | Last : ${averageTime} s | ${operationSpeed}`, canvasElement.width / 2 , canvasElement.height / 2 + 400, 800);

    if(randomNumber === hands_number){
        lastRandomNumber = randomNumber;
        if(activeDifficulty === 'easy') {
            if(randomNumber === 99) {
                easyCountdownDirection = -1;
            }
            if(randomNumber === 0) {
                easyCountdownDirection = 1;
            }
            randomNumber += easyCountdownDirection;
        }
        else {
            randomNumber = Math.floor(Math.random() * 100);
        }
    }
    canvasCtx.restore();
}
const holistic = new mpHolistic.Holistic(config);
holistic.onResults(onResults, 22);
// Present a control panel through which the user can manipulate the solution
// options.
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    effect: 'background',
    difficulty: 'easy',
})
    .add([
    new controls.StaticText({ title: 'Cheese and Bop' }),
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.Slider({
        title: 'Difficulty',
        field: 'difficulty',
        discrete: {'easy': 'easy', 'normal': 'normal', 'hard': 'hard'},
    }),
    new controls.SourcePicker({
        onSourceChanged: () => {
            // Resets because the pose gives better results when reset between
            // source changes.
            holistic.reset();
        },
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await holistic.send({ image: input });
        },
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    activeDifficulty = x['difficulty'];
    console.log(activeDifficulty);
    activeEffect = x['effect'];
    holistic.setOptions(options);
});
