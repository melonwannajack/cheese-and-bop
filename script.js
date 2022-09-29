import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";
// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([
  {client: 'Chrome'},
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
const config = {
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@` +
      `${mpHolistic.VERSION}/${file}`;
  }
};
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

function findHandPosition(handLandmarks) {
  if (handLandmarks) {
    const wrist = handLandmarks[0];
    const thumb = handLandmarks[4];
    const index = handLandmarks[8];
    const middle = handLandmarks[12];
    const ring = handLandmarks[16];
    const pinky = handLandmarks[20];

    const indexBase = handLandmarks[5];
    const pinkyBase = handLandmarks[17];

    const handCenter = {
      x: (wrist.x + indexBase.x + pinkyBase.x) / 3,
      y: (wrist.y + indexBase.y + pinkyBase.y) / 3,
      z: (wrist.z + indexBase.z + pinkyBase.z) / 3,
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
      Math.pow((screenHandCenter.x - screenWrist.x), 2)
      + Math.pow((screenHandCenter.y - screenWrist.y), 2)
    );

    let hand_number = 0;
    if (screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenThumb.x - screenHandCenter.x), 2)
      + Math.pow((screenThumb.y - screenHandCenter.y), 2))) {
      hand_number += 5;
    }
    if (screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenIndex.x - screenHandCenter.x), 2)
      + Math.pow((screenIndex.y - screenHandCenter.y), 2))) {
      hand_number += 1;
    }
    if (screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenMiddle.x - screenHandCenter.x), 2)
      + Math.pow((screenMiddle.y - screenHandCenter.y), 2))) {
      hand_number += 1;
    }
    if (screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenRing.x - screenHandCenter.x), 2)
      + Math.pow((screenRing.y - screenHandCenter.y), 2))) {
      hand_number += 1;
    }
    if (screenRadioImage * 1.8 < Math.sqrt(Math.pow((screenPinky.x - screenHandCenter.x), 2)
      + Math.pow((screenPinky.y - screenHandCenter.y), 2))) {
      hand_number += 1;
    }
    return { number: hand_number, hand_position: { x: screenHandCenter.x, y: screenHandCenter.y } };

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

  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.lineWidth = 25;

  let hands_number = 0;
  let leftHandPosition;
  let rightHandPosition;

  if (results.leftHandLandmarks) {
    leftHandPosition = findHandPosition(results.leftHandLandmarks);
    hands_number += leftHandPosition.number;
  }
  if (results.rightHandLandmarks) {
    rightHandPosition = findHandPosition(results.rightHandLandmarks)
    hands_number +=  rightHandPosition?.number * 10;
  }
  const ok_color = "rgba(0,255,18,0.3)";
  const transition_color = "rgba(0,208,255,0.3)";
  const ko_color =  "rgb(236,150,54)";
  if (Math.floor(hands_number / 10) === Math.floor( randomNumber / 10)) {
    drawingUtils.drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ok_color});
  }
  if (hands_number % 10 === randomNumber % 10) {
    drawingUtils.drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ok_color});
  }
  if (hands_number === lastRandomNumber) {
    drawingUtils.drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ok_color});
    drawingUtils.drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ok_color});
  }
  else {
    drawingUtils.drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ko_color});
    drawingUtils.drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, {color: ko_color});
  }

  canvasCtx.font = '80px Major Mono Display';

  canvasCtx.fillStyle = 'rgba(36,108,246,1)';

  canvasCtx.font = '90px Major Mono Display';
  canvasCtx.textAlign = 'center';

  let screenNumber;
  let screenNumberMessage;

  if (activeDifficulty === 'hard') {
    screenNumber = randomNumber - lastRandomNumber;
    screenNumberMessage = `${lastRandomNumber}${screenNumber > 0 ? `+${screenNumber}` : screenNumber} `;
  } else {
    screenNumber = randomNumber;
    screenNumberMessage = `${screenNumber > 0 ? `${screenNumber}` : screenNumber} `;
  }

  // canvasCtx.fillText(screenNumberMessage, canvasElement.width / 2, 100, 800);

  if(leftHandPosition && rightHandPosition) {

    canvasCtx.fillText(screenNumberMessage,
      (leftHandPosition.hand_position.x + rightHandPosition.hand_position.x) / 2,
      (leftHandPosition.hand_position.y + rightHandPosition.hand_position.y) / 2 - 100 , 800);

    if (lastRandomNumber === hands_number) {
      canvasCtx.fillStyle = 'green';
    } else {
      canvasCtx.fillStyle = 'red';
    }
    canvasCtx.fillText(hands_number,
      (leftHandPosition.hand_position.x + rightHandPosition.hand_position.x) / 2,
      (leftHandPosition.hand_position.y + rightHandPosition.hand_position.y) / 2,
        800);
  }
  else{
    canvasCtx.fillText(screenNumberMessage, canvasElement.width / 2, 100, 800);
    canvasCtx.fillText('Hands up !', canvasElement.width / 2 - 100, canvasElement.height / 2 , 800);

  }

  if (hands_number === randomNumber) {

    // startTime = Date.now();

    operationSpeed = Number(averageTime / countCorrectAnswers).toFixed(2);
    countCorrectAnswers += 1;

  }
  averageTime =  Date.now() - startTime ;
  averageTime = Number(averageTime / 1000).toFixed(2);

  canvasCtx.font = '60px Major Mono Display';
  canvasCtx.fillStyle = 'green';
  canvasCtx.fillText(`Points : ${countCorrectAnswers}`, canvasElement.width / 2, canvasElement.height / 2 + 200, 800);

  canvasCtx.font = '40px Major Mono Display';
  canvasCtx.fillStyle = 'green';
  canvasCtx.fillText(`Level : ${activeDifficulty}`, canvasElement.width / 2, canvasElement.height - 100, 800);
  canvasCtx.fillText(`${averageTime} s`, 100, canvasElement.height * 0.9, 800);
  canvasCtx.fillText(`${operationSpeed}s`, canvasElement.width - 100, canvasElement.height - 100, 800);

  if (randomNumber === hands_number) {
    lastRandomNumber = randomNumber;

    if (activeDifficulty === 'easy') {
      if (randomNumber === 99) {
        easyCountdownDirection = -1;
      }
      if (randomNumber === 0) {
        easyCountdownDirection = 1;
      }
      randomNumber += easyCountdownDirection;
    } else {
      randomNumber = Math.floor(Math.random() * 100);
    }
  }
  canvasCtx.restore();
}

const holistic = new mpHolistic.Holistic(config);
holistic.onResults(onResults);
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
    new controls.StaticText({title: '🧀&💡'}),
    // new controls.Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
    new controls.Slider({
      title: 'Difficulty',
      field: 'difficulty',
      discrete: {'supereasy': 'supereasy', 'easy': 'easy', 'normal': 'normal', 'hard': 'hard'},
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
        } else {
          width = window.innerWidth;
          height = width * aspect;
        }
        canvasElement.width = width;
        canvasElement.height = height;
        await holistic.send({image: input});
      },
    }),
  ])
  .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    activeDifficulty = x['difficulty'];
    activeEffect = x['effect'];
    holistic.setOptions(options);
  });
