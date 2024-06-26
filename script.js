let selectedTool = null;
const paintBrush = {
    stroke: 6,
    strokeShape: "square",
    strokeQuality: "high",
};
const eraser = {
    stroke: 6,
    strokeShape: "square",
    strokeQuality: "medium",
};
const shapeTool = {
    stroke: 6,
    strokeShape: "sharp",
    shape: "rectangle",
    fillShape: false,
    shapeFillColor: "#000000",
    opacity: 1,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    shadowBlur: 5,
    shadowOpacity: 75,
    rawShadowColor: "#000000",
    shadowColor: "rgba(0, 0, 0, 0)",
};
const textTool = {
    fontSize: 16,
    textAlignment: "Left",
    font: "Arial",
    italic: false,
    bold: false,
    text: "",
    textOpacity: 1,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    shadowBlur: 5,
    shadowOpacity: 75,
    rawShadowColor: "#000000",
    shadowColor: "rgba(0, 0, 0, 0)",
}
const canvasProperties = {
    width: 800,
    height: 600,
    isTransparentBackground: true,
    backgroundColor: "#000000",
}
let shapePoints = [];
const borderResizeAreas = {
    areaPoints: {
        left: [[],[]],
        right: [[],[]],
        top: [[],[]],
        bottom: [[],[]],
    },
    pointerInArea: undefined,
    setBorderResizeAreas(){//idk how to make this method less awful 
        this.areaPoints.left[0][0] = selectionBoxPoints[0][0]-areaBorderThickness;
        this.areaPoints.left[0][1] = selectionBoxPoints[0][1];
        this.areaPoints.left[1][0] = selectionBoxPoints[0][0];
        this.areaPoints.left[1][1] = selectionBoxPoints[1][1];

        this.areaPoints.right[0][0] = selectionBoxPoints[1][0];
        this.areaPoints.right[0][1] = selectionBoxPoints[0][1];
        this.areaPoints.right[1][0] = selectionBoxPoints[1][0]+areaBorderThickness;
        this.areaPoints.right[1][1] = selectionBoxPoints[1][1];

        this.areaPoints.top[0][0] = selectionBoxPoints[0][0];
        this.areaPoints.top[0][1] = selectionBoxPoints[0][1]-areaBorderThickness;
        this.areaPoints.top[1][0] = selectionBoxPoints[1][0];
        this.areaPoints.top[1][1] = selectionBoxPoints[0][1];

        this.areaPoints.bottom[0][0] = selectionBoxPoints[0][0];
        this.areaPoints.bottom[0][1] = selectionBoxPoints[1][1];
        this.areaPoints.bottom[1][0] = selectionBoxPoints[1][0];
        this.areaPoints.bottom[1][1] = selectionBoxPoints[1][1]+areaBorderThickness;
    }
}
let selectionBoxPoints = [];
let lastRadius = 0;
const selectedColorPicker = document.getElementById("SelectedColor");
const selectedColorHexInput = document.getElementById("SelectedColorHex");
const cursorLocationInput = document.getElementById("CursorLocationInput");
const selectedColorBox = document.getElementById("SelectedColorBox");
const canvas = document.getElementById("Canvas");
const statusText = document.getElementById("Status");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const previewCanvas = document.getElementById("PreviewCanvas");
const pctx = previewCanvas.getContext("2d", { willReadFrequently: true });
const canvasContainer = document.getElementById("CanvasContainer");
const tempCanvas = document.createElement("canvas");
const tctx = tempCanvas.getContext("2d");
const shadowPreviewCanvas = document.getElementById("ShadowPreviewCanvas");
const spctx = shadowPreviewCanvas.getContext("2d");
let textNodeContent;

let cursorX = 0;
let cursorY = 0;
let isMouseDown = false;
let undoActionsList = [];
let redoActionList = [];
let undoActionPropertiesList = [];
let redoActionPropertiesList = [];
let lineList = [];
let cooldown = 0;
let polygon = new Path2D();
let backgroundImage;
let movedCanvasFragment;
let isMovingFragment = false;
let distanceXY = [];
let isWriting = false;
let arrowIncrementDistance = 1;
let verticallyMovedDistance = 0;
let horizontallyMovedDistance = 0;
let FirstActionsImageData = undefined;
let actionHistoryLimit = 25;
let areaBorderThickness = 15;
let isHoldingShift = false;

//Functions returning values
function pythagoras(a, b){
    return Math.sqrt(a*a+b*b);
}
function rgbToHex(r, g, b) { //thx man https://stackoverflow.com/a/5624139
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}
function hexToRgb(rawhex) { //ty https://stackoverflow.com/a/11508164
    let hex = rawhex.substring(1);
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return r + ", " + g + ", " + b;
}
function invertRgb(r, g, b, a){
    r = (255 - r);
    g = (255 - g);
    b = (255 - b);
    if (a == 0){
        r = g = b = 55;
    }
    return `${r},${g},${b}`
}
function enforceLimits(min, max, isFloat, value){
    if (isFloat == false){
        value = Math.floor(value);
    }
    if (value >= max){
        value = max;
    }
    else if(value <= min){
        value = min;
    }
    return value;
}


function selectTool(t){
    let ToolPreferencesFieldset = document.getElementById("ToolPreferencesFieldset");
    canvasContainer.style.cursor = "crosshair";
    changeActionButtonStatus("Copy", "off");
    changeActionButtonStatus("Cut", "off");
    textNodeContent = undefined;
    ctx.shadowColor = "rgba(0, 0, 0, 0)"
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selectedColorPicker.value;
    clearPreviewCanvas();
    removeSelection()
    if (selectedTool === null){
        document.getElementById("ToolPreferencesBox").style.opacity = 1;
        document.getElementById("ToolPreferencesBox").style.transform = "scale(1)";
    }
    else{
        reverseToolButtonColor();
    }
    selectedTool = t.id.slice(0,3);
    changeToolButtonColor(t);
    switch (selectedTool){
        case "PBr":
            ToolPreferencesFieldset.innerHTML = `<legend>Tool properties</legend> <div> <label>Brush size: </label><br> <input id="PBrStrokeSlider" type="range" min="1" max="72" value="${paintBrush.stroke}" oninput="changeStroke(this)"> <input id="PBrStrokeValue" type="number" min="1" max="72" value="${paintBrush.stroke}" onchange="changeStroke(this)"><br> </div> <div> <label>Brush shape: </label><br> <select id="SelectBrushShape" onchange="changeShape(this)"> <option value="square">Square</option> <option value="round">Round</option> </select> </div> <div><br> <label>Brush stroke quality: </label><br> <select id="SelectBrushQuality" onchange="changeQuality(this)"> <option value="original">Original</option> <option value="high">High</option> <option value="medium">Medium</option> <option value="low">Low</option></select></div>`;
            ctx.globalCompositeOperation="source-over";
            ctx.lineWidth = paintBrush.stroke;
            changeShape();
            document.getElementById("SelectBrushShape").value = paintBrush.strokeShape;
            document.getElementById("SelectBrushQuality").value = paintBrush.strokeQuality;
            cooldown = 0;
            tippy("#SelectBrushQuality",{content: "Reduces the number of points when drawing custom strokes in order, to enhance the performance.", delay: [400, 100],
            animation: "shift-toward", placement: "bottom",});
            break;
        case "Era":
            ToolPreferencesFieldset.innerHTML = `<legend>Tool properties</legend> <div> <label>Eraser size: </label><br> <input id="EraStrokeSlider" type="range" min="1" max="72" value="${eraser.stroke}" oninput="changeStroke(this)"> <input id="EraStrokeValue" type="number" min="1" max="72" value="${eraser.stroke}" onchange="changeStroke(this)"><br> </div> <div> <label>Eraser shape: </label><br> <select id="SelectEraserShape" onchange="changeShape(this)"> <option value="square">Square</option> <option value="round">Rounded</option> </select> </div> <br> <label>Eraser stroke quality: </label><br> <select id="SelectEraserQuality" onchange="changeQuality(this)"> <option value="original">Original</option> <option value="high">High</option> <option value="medium">Medium</option> <option value="low">Low</option></select></div>`;
            ctx.globalCompositeOperation="destination-out";
            ctx.lineWidth = eraser.stroke;
            changeShape();
            document.getElementById("SelectEraserShape").value = eraser.strokeShape;
            document.getElementById("SelectEraserQuality").value = eraser.strokeQuality;
            cooldown = 0;
            tippy("#SelectEraserQuality",{content: "Reduces the number of points when drawing custom strokes in order, to enhance the performance.", delay: [400, 100],
            animation: "shift-toward", placement: "bottom",});
            break;
        case "STo":
            ToolPreferencesFieldset.innerHTML = `<legend>Tool properties</legend> <div> <label>Shape stroke: </label><br> <input id="SToStrokeSlider" type="range" min="1" max="72" value="${shapeTool.stroke}" oninput="changeStroke(this)"> <input id="SToStrokeValue" type="number" min="1" max="72" value="${shapeTool.stroke}" onchange="changeStroke(this)"><br> </div> <div> <label>Selected shape: </label><br> <select id="SelectShapeToolShape" onchange="setShapeToolShape(this)"> <option id="RectangleOption" value="rectangle">Rectangle</option> <option value="circle">Circle</option> <option value="line">Line</option> <option value="polygon">Polygon</option> </select><input type="number" min="3" max="24" value="3" id="InputCorners" onchange="resetPolygon()" style="width: 35px; display: none";></div><div><br><label>Selected corner shape: </label><br> <select id="SelectShapeToolCornerShape" onchange="changeShape(this)"> <option value="sharp">Sharp</option> <option value="cut">Cut</option> <option value="rounded">Rounded</option></select></div>  <div><br><label>Fill shape: </label> <input type="checkbox" id="CheckboxShapeFill" onclick="changeIsFillShape(this)"></div> <div><label>Fill color: </label><br><input type="color" id="InputFillColor" onchange="setFillColor(this)"><button onclick="setFillColorFromPrimary()">Copy stroke color</button></div> <div><label>Shape opacity:</label><br><input type="number" id="ShapeOpacityInput" min="1" max="100" value="100"></div><button onclick="openShadowPropertiesPopup('shape', 'open')">Open shape shadow properties</button>`;
            tippy("#InputCorners",{content: "Number of angles of a polygon", delay: [400, 100],
            animation: "shift-toward", placement: "bottom",});
            ctx.globalCompositeOperation="source-over";
            ctx.lineWidth = shapeTool.stroke;
            shapePoints = [];
            document.getElementById("SelectShapeToolShape").value = shapeTool.shape;
            document.getElementById("CheckboxShapeFill").checked = shapeTool.fillShape;
            document.getElementById("InputFillColor").value = shapeTool.shapeFillColor;
            document.getElementById("ShapeOpacityInput").value = shapeTool.opacity * 100;
            if (shapeTool.shape == "polygon"){
                document.getElementById("InputCorners").style.display = "inline";
            }
            changeShape();
            tippy("#SelectShapeToolShape",{content: "Hold down <strong>SHIFT</strong>, to draw special shapes. Line as selected shape + SHIFT = <strong>STRAIGHT LINE</strong><br>Rectangle as selected shape + SHIFT = <strong>SQUARE</strong><br>", delay: [50, 100], animation: "shift-toward", allowHTML: true,})
            break;
        case "Tex":
            ToolPreferencesFieldset.innerHTML = `<legend>Tool properties</legend> <div> <label>Font size: </label><br> <input id="TexStrokeSlider" type="range" min="1" max="256" value="${textTool.fontSize}" oninput="changeStroke(this)"> <input id="TexStrokeValue" type="number" min="1" max="256" value="${textTool.fontSize}" onchange="changeStroke(this)"><br> </div> <div> <label>Selected font: </label><br> <select id="TexFontSelect" onchange="changeFont(this)"> <option value="Courier New">Courier New</option> <option value="Franklin Gothic Medium">Franklin Gothic Medium</option> <option value="Gill Sans">Gill Sans</option> <option value="Segoe UI">Segoe UI</option> <option value="Times New Roman">Times New Roman</option> <option value="Trebuchet MS">Trebuchet MS</option> <option value="Arial">Arial</option> <option value="Cambria">Cambria</option> <option value="Georgia">Georgia</option> <option value="Verdana">Verdana</option> </select></div> 
            <div id="PropertiesFieldsContainer">
                <div class="PropertiesFields"> 
                    <div class="PropertiesButtons" id="Left" onclick="changeTextAlignment(this)">
                        <svg class="IconMargin" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35 35" style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <path class="LeftSvgElement" fill="#9A949B" d="M25.1,6.1H4.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h20.3c0.8,0,1.5,0.7,1.5,1.5S25.9,6.1,25.1,6.1z"/>
                            <path class="LeftSvgElement" fill="#9A949B" d="M25.1,21.8H4.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h20.3c0.8,0,1.5,0.7,1.5,1.5S25.9,21.8,25.1,21.8z"/>
                            <path class="LeftSvgElement" fill="#9A949B" d="M30.2,14H4.8c-0.8,0-1.5-0.7-1.5-1.5S3.9,11,4.8,11h25.4c0.8,0,1.5,0.7,1.5,1.5S31,14,30.2,14z"/>
                            <path class="LeftSvgElement" fill="#9A949B" d="M30.2,29.7H4.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h25.4c0.8,0,1.5,0.7,1.5,1.5S31,29.7,30.2,29.7z"/>
                        </svg>
                    </div> 
                    <div class="PropertiesButtons" id="Center" onclick="changeTextAlignment(this)">
                        <svg class="IconMargin" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35 35" style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <path class="CenterSvgElement" fill="#9A949B" d="M27.7,6.1H7.3c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h20.3c0.8,0,1.5,0.7,1.5,1.5S28.5,6.1,27.7,6.1z"/>
                            <path class="CenterSvgElement" fill="#9A949B" d="M27.6,21.8H7.3c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h20.3c0.8,0,1.5,0.7,1.5,1.5S28.5,21.8,27.6,21.8z"/>
                            <path class="CenterSvgElement" fill="#9A949B" d="M30.2,14H4.8c-0.8,0-1.5-0.7-1.5-1.5S3.9,11,4.8,11h25.4c0.8,0,1.5,0.7,1.5,1.5S31,14,30.2,14z"/>
                            <path class="CenterSvgElement" fill="#9A949B" d="M30.2,29.7H4.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h25.4c0.8,0,1.5,0.7,1.5,1.5S31,29.7,30.2,29.7z"/>
                        </svg>
                    </div> 
                    <div class="PropertiesButtons" id="Right" onclick="changeTextAlignment(this)">
                        <svg class="IconMargin" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35 35" style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <path class="RightSvgElement" fill="#9A949B"  d="M30.2,6.1H9.9C9,6.1,8.4,5.4,8.4,4.6S9,3.1,9.9,3.1h20.3c0.8,0,1.5,0.7,1.5,1.5S31,6.1,30.2,6.1z"/>
                            <path class="RightSvgElement" fill="#9A949B" d="M30.2,21.8H9.9c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h20.3c0.8,0,1.5,0.7,1.5,1.5S31,21.8,30.2,21.8z"/>
                            <path class="RightSvgElement" fill="#9A949B" d="M30.2,14H4.8c-0.8,0-1.5-0.7-1.5-1.5S3.9,11,4.8,11h25.4c0.8,0,1.5,0.7,1.5,1.5S31,14,30.2,14z"/>
                            <path class="RightSvgElement" fill="#9A949B" d="M30.2,29.7H4.8c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h25.4c0.8,0,1.5,0.7,1.5,1.5S31,29.7,30.2,29.7z"/>7z"/>
                        </svg>
                    </div> 
                </div> 
                    <div class="PropertiesFields">
                        <div class="PropertiesButtons" id="bold" onclick="changeTextStyle(this)">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35     35" style="enable-background:new 0 0 35 35;" xml:space="preserve">
                                <path class="BoldSvgElement" fill="#9A949B" class="st0" d="M6.56,4.76C7.18,4.78,8,4.8,9,4.83c1.01,0.02,2.02,0.04,3.02,0.04c1.18,0,2.3-0.01,3.37-0.04c1.07-0.02,1.83-0.04,2.29-0.04c2.98,0,5.2,0.53,6.68,1.58c1.48,1.06,2.21,2.41,2.21,4.07c0,0.84-0.25,1.69-0.76,2.56c-0.5,0.86-1.28,1.63-2.34,2.3c-1.06,0.67-2.42,1.16-4.1,1.48v0.07c2.26,0.17,4.04,0.58,5.36,1.22c1.32,0.65,2.27,1.43,2.84,2.34s0.86,1.86,0.86,2.84c0,1.51-0.4,2.78-1.19,3.82s-1.93,1.82-3.42,2.36s-3.26,0.81-5.33,0.81c-0.58,0-1.4-0.02-2.48-0.05c-1.08-0.04-2.39-0.05-3.92-0.05c-1.06,0-2.09,0.01-3.1,0.02C8,30.17,7.18,30.2,6.56,30.24v-0.72c0.77-0.05,1.34-0.14,1.73-0.29c0.38-0.14,0.64-0.43,0.77-0.86c0.13-0.43,0.2-1.08,0.2-1.94V8.57c0-0.89-0.07-1.54-0.2-1.96S8.66,5.9,8.27,5.75C7.87,5.59,7.3,5.5,6.56,5.48V4.76z M17.21,5.48c-0.94,0-1.54,0.2-1.82,0.61c-0.28,0.41-0.41,1.24-0.41,2.48v17.86c0,0.84,0.07,1.48,0.2,1.91s0.37,0.72,0.72,0.86c0.35,0.14,0.87,0.22,1.57,0.22c1.75,0,3.02-0.55,3.82-1.64s1.19-2.65,1.19-4.66c0-1.85-0.46-3.28-1.39-4.28s-2.45-1.51-4.59-1.51h-3.06v-0.61h3.1c1.13,0,2-0.27,2.61-0.81c0.61-0.54,1.03-1.26,1.26-2.16c0.23-0.9,0.34-1.87,0.34-2.9c0-1.78-0.28-3.11-0.83-4.01C19.36,5.93,18.46,5.48,17.21,5.48z"/>
                            </svg>
                        </div> 
                        <div class="PropertiesButtons" id="italic" onclick="changeTextStyle(this)">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35     35" style="enable-background:new 0 0 35 35;" xml:space="preserve">
                                <path class="ItalicSvgElement" fill="#9A949B" class="st0" d="M16.76,26.43c-0.22,0.86-0.31,1.51-0.29,1.94c0.02,0.43,0.23,0.72,0.61,0.86c0.38,0.14,0.98,0.24,1.8,0.29l-0.14,0.72c-0.55-0.05-1.24-0.08-2.07-0.09c-0.83-0.01-1.66-0.02-2.5-0.02c-0.94,0-1.8,0.01-2.59,0.02c-0.79,0.01-1.45,0.04-1.98,0.09l0.18-0.72c0.79-0.05,1.41-0.14,1.85-0.29c0.44-0.14,0.8-0.43,1.06-0.86c0.26-0.43,0.5-1.08,0.72-1.94l4.75-17.86c0.24-0.89,0.34-1.54,0.29-1.96c-0.05-0.42-0.26-0.71-0.63-0.86c-0.37-0.16-0.97-0.25-1.78-0.27l0.18-0.72c0.48,0.02,1.13,0.05,1.94,0.07c0.82,0.02,1.69,0.04,2.63,0.04c0.84,0,1.67-0.01,2.5-0.04c0.83-0.02,1.53-0.05,2.11-0.07l-0.18,0.72c-0.82,0.02-1.45,0.11-1.91,0.27c-0.46,0.16-0.81,0.44-1.06,0.86s-0.5,1.07-0.74,1.96L16.76,26.43z"/>
                            </svg>
                        </div> 
                        
                    </div> 
                </div>
                <div>
                    <label>Text opacity:</label><br>
                    <input type="number" id="TextOpacityInput" min="1" max="100" value="100">
                </div>
                <button style="margin-bottom: 10px" onclick="openShadowPropertiesPopup('text', 'open')">Open text shadow properties</button>
                <textarea onmouseleave="this.blur()" onchange="saveText(this)" style="resize: vertical;" id="TextNodeContent">${textTool.text}</textarea>`;
            textNodeContent = document.getElementById("TextNodeContent");
            ctx.globalCompositeOperation="source-over";
            document.getElementById("TexFontSelect").value = textTool.font;
            document.getElementById("TextOpacityInput").value = textTool.textOpacity * 100;
            changeTextAlignment();
            changeTextStyle();
            tippy("#Left",{content: "<strong>Left alignment (Shift + Left arrow)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#Center",{content: "<strong>Center alignment (Shift + Right arrow)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#Right",{content: "<strong>Right alignment (Shift + Down arrow)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#bold",{content: "<strong>Bold (Shift + B)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#italic",{content: "<strong>Italic (Shift + I)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            break;
        case "Sel":
            document.getElementById("ToolPreferencesFieldset").innerHTML = `<legend>Tool properties</legend><br><label>Actions</label><br>
            <div id="PropertiesFieldsContainer">
                <div class="PropertiesFields">
                    <div class="PropertiesButtons" id="horizontal" onclick="Fragment.mirror(this)">
                        <svg class="IconMargin" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35        35"    style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <polygon class="MirrorSvgElement" fill="#c169d3" points="14.95,5 14.95,30.02 2.11,30.02"/>
                            <path class="MirrorSvgElement" fill="#c169d3" d="M14.95,31.02H2.11c-0.35,0-0.67-0.18-0.85-0.48c-0.18-0.3-0.2-0.67-0.04-0.98L14.06,4.54c0.21-0.41,0.67-0.62,1.12-0.52c0.45,0.11,0.77,0.51,0.77,0.97v25.02C15.95,30.57,15.5,31.02,14.95,31.02z M3.75,29.02h10.2V9.14L3.75,29.02z"/>
                            <polygon class="MirrorSvgElement" fill="#682375" points="20.05,4.82 20.05,29.84 32.89,29.84"/>
                            <path class="MirrorSvgElement" fill="#682375" d="M32.89,30.84H20.05c-0.55,0-1-0.45-1-1V4.82c0-0.46,0.32-0.86,0.77-0.97c0.45-0.11,0.91,0.1,1.12,0.52l12.83,25.02c0.16,0.31,0.15,0.68-0.04,0.98C33.56,30.66,33.24,30.84,32.89,30.84z M21.05,28.84h10.2L21.05,8.96V28.84z"/>
                        </svg>
                    </div>
                    <div class="PropertiesButtons" id="vertical" onclick="Fragment.mirror(this)">
                        <svg class="IconMargin" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35         35"    style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <polygon class="MirrorSvgElement" fill="#c169d3" points="29.92,14.86 4.9,14.86 4.9,2.03 	"/>
                            <path class="MirrorSvgElement" fill="#c169d3" d="M29.92,15.86H4.9c-0.55,0-1-0.45-1-1V2.03c0-0.35,0.18-0.67,0.48-0.85C4.68,1,5.05,0.98,5.36,1.14l25.02,12.83c0.41,0.21,0.62,0.68,0.52,1.12C30.78,15.55,30.38,15.86,29.92,15.86z M5.9,13.86h19.88L5.9,3.67V13.86z"/>
                            <polygon class="MirrorSvgElement" fill="#682375" points="30.1,19.97 5.08,19.97 5.08,32.81 	"/>
                            <path class="MirrorSvgElement" fill="#682375" d="M5.08,33.81c-0.18,0-0.36-0.05-0.52-0.15c-0.3-0.18-0.48-0.5-0.48-0.85V19.97c0-0.55,0.45-1,1-1H30.1c0.46,0,0.86,0.32,0.97,0.77c0.11,0.45-0.1,0.91-0.52,1.12L5.54,33.7C5.39,33.77,5.24,33.81,5.08,33.81z M6.08,20.97v10.2l19.88-10.2H6.08z"/>
                        </svg>
                    </div>
                </div>
                <div class="PropertiesFields">
                    <div class="PropertiesButtons" id="counterclockwise" onclick="Fragment.rotate(this)">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35         35"    style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <path fill="#682375" d="M15.69,32.29c3.71,0,7.2-1.45,9.83-4.07c5.42-5.42,5.42-14.24,0-19.65c-2.62-2.62-6.12-4.07-9.83-4.07c-2.61,0-5.1,0.71-7.27,2.04V4.21c0-0.83-0.67-1.5-1.5-1.5s-1.5,0.67-1.5,1.5v5.4c0,0.04,0,0.08,0,0.12c0.02,0.3,0.13,0.57,0.3,0.8c0.06,0.08,0.12,0.15,0.2,0.21c0.26,0.23,0.59,0.37,0.97,0.38c0,0,0,0,0,0l5.51,0.1c0.83,0.04,1.51-0.64,1.53-1.47c0-0.01,0-0.02,0-0.03c0-0.82-0.65-1.48-1.47-1.5l-0.69-0.01c1.23-0.47,2.55-0.72,3.91-0.72c2.91,0,5.65,1.13,7.71,3.19c4.25,4.25,4.25,11.16,0,15.41c-2.06,2.06-4.8,3.19-7.71,3.19s-5.65-1.13-7.71-3.19c-0.59-0.59-1.54-0.59-2.12,0s-0.59,1.54,0,2.12C8.48,30.84,11.98,32.29,15.69,32.29z"/>
                            <path fill="#682375" d="M12.75,24.18c-0.33-0.21-0.57-0.55-0.66-0.94l-1.64-7.41c-0.09-0.39-0.01-0.79,0.2-1.13s0.55-0.57,0.94-0.66L19,12.4c0.8-0.17,1.61,0.33,1.79,1.14l1.64,7.41c0.18,0.81-0.33,1.61-1.14,1.79l-7.41,1.64c-0.11,0.02-0.22,0.04-0.32,0.04C13.27,24.41,12.99,24.33,12.75,24.18z M18.19,15.66l-4.48,0.99l0.99,4.48l4.48-0.99L18.19,15.66z"/>
                        </svg>
                    </div>
                    <div class="PropertiesButtons" id="clockwise" onclick="Fragment.rotate(this)">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 35         35"    style="enable-background:new 0 0 35 35;" xml:space="preserve">
                            <path fill="#682375" d="M19.31,32.29c-3.71,0-7.2-1.45-9.83-4.07c-5.42-5.42-5.42-14.24,0-19.65c2.62-2.62,6.12-4.07,9.83-4.07c2.61,0,5.1,0.71,7.27,2.04V4.21c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5v5.4c0,0.04,0,0.08,0,0.12c-0.02,0.3-0.13,0.57-0.3,0.8c-0.06,0.08-0.12,0.15-0.2,0.21c-0.26,0.23-0.59,0.37-0.97,0.38c0,0,0,0,0,0l-5.51,0.1c-0.83,0.04-1.51-0.64-1.53-1.47c0-0.01,0-0.02,0-0.03c0-0.82,0.65-1.48,1.47-1.5l0.69-0.01c-1.23-0.47-2.55-0.72-3.91-0.72c-2.91,0-5.65,1.13-7.71,3.19c-4.25,4.25-4.25,11.16,0,15.41c2.06,2.06,4.8,3.19,7.71,3.19s5.65-1.13,7.71-3.19c0.59-0.59,1.54-0.59,2.12,0s0.59,1.54,0,2.12C26.52,30.84,23.02,32.29,19.31,32.29z"/>
                            <path fill="#682375" d="M21.44,24.41c-0.11,0-0.22-0.01-0.32-0.04l-7.41-1.64c-0.81-0.18-1.32-0.98-1.14-1.79l1.64-7.41c0.18-0.81,0.98-1.31,1.79-1.14l7.41,1.64c0.39,0.09,0.73,0.32,0.94,0.66s0.29,0.74,0.2,1.13l-1.64,7.41c-0.09,0.39-0.32,0.73-0.66,0.94C22.01,24.33,21.73,24.41,21.44,24.41z M15.82,20.13l4.48,0.99l0.99-4.48l-4.48-0.99L15.82,20.13z"/>
                        </svg>
                    </div>
                </div>
            </div>`;
            removeSelection();
            tippy("#horizontal",{content: "<strong>Mirror the area horizontally (Shift + H)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#vertical",{content: "<strong>Mirror the area vertically (Shift + V)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#clockwise",{content: "<strong>Rotate the area by 90° clockwise (Shift + R)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            tippy("#counterclockwise",{content: "<strong>Rotate the area by 90° counterclockwise (Shift + T)</strong>", delay: [400, 100], animation: "shift-toward", allowHTML: true,});
            break;
        case "CPi":
            document.getElementById("ToolPreferencesFieldset").innerHTML = `<legend>Tool properties</legend><br><label>This tool has no properties</label>`;
            break;
    }
}

//Set tool properties
function changeStroke(t){
    switch(selectedTool){
        case "PBr":
            paintBrush.stroke = enforceLimits(1, 72, false, t.value);
            t.value = paintBrush.stroke;
            ctx.lineWidth = paintBrush.stroke;
            break;
        case "Era":
            eraser.stroke = enforceLimits(1, 72, false, t.value);
            t.value = eraser.stroke
            ctx.lineWidth = eraser.stroke;
            break;
        case "STo":
            shapeTool.stroke = enforceLimits(1, 72, false, t.value);
            t.value = shapeTool.stroke;
            ctx.lineWidth = shapeTool.stroke;
            break;
        case "Tex":
            textTool.fontSize = enforceLimits(1, 256, false, t.value);
            t.value = textTool.fontSize;
            break;
    }
    if (t.id.slice(-5) == "Value"){
        document.getElementById(`${selectedTool}StrokeSlider`).value = t.value;
    }
    else{
        document.getElementById(`${selectedTool}StrokeValue`).value = t.value;
    }
}
function changeShape(t){
    switch (selectedTool){
        case "PBr":
            if (t != undefined){
                paintBrush.strokeShape = t.value;
            }
            if (paintBrush.strokeShape == "square"){
                ctx.lineCap = "butt";
                ctx.lineJoin = "bevel";
            }
            else if(paintBrush.strokeShape == "round"){
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
            break;
        case "Era":
            if (t != undefined){
                eraser.strokeShape = t.value;
            }
            if (eraser.strokeShape == "square"){
                ctx.lineCap = "butt";
                ctx.lineJoin = "bevel";
            }
            else if(eraser.strokeShape == "round"){
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
            break;
        case "STo":
            if (t != undefined){
                shapeTool.strokeShape = t.value;
            }
            if (shapeTool.strokeShape == "sharp"){
                ctx.lineCap = "butt";
                ctx.lineJoin = "miter";
            }
            else if (shapeTool.strokeShape == "cut"){
                ctx.lineCap = "butt";
                ctx.lineJoin = "bevel";
            }
            else if (shapeTool.strokeShape == "rounded"){
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
            break;
    }
}
function setShapeToolShape(t){
    if (selectedTool == "STo"){
        if (t != undefined){
            shapeTool.shape = t.value;
            if (shapeTool.shape == "polygon"){
                document.getElementById("InputCorners").style.display = "inline";
            }
            else {
                document.getElementById("InputCorners").style.display = "none";
            }
        }
        shapePoints = [];
    }
}
function changeQuality(t){
    if (selectedTool == "PBr"){
        paintBrush.strokeQuality = t.value;
        cooldown = 0;
    }
    else if (selectedTool == "Era"){
        eraser.strokeQuality = t.value;
        cooldown = 0;
    }
}
function changeIsFillShape(t){
    if (t.checked == true){
        shapeTool.fillShape = true;
    }
    else{
        shapeTool.fillShape = false;
    }
}
function changeFont(t){
    if (t != undefined){
        textTool.font = t.value;
    }  
}
function changeTextAlignment(t){
    if (t != undefined){
        textTool.textAlignment = t.id;
        let tempAlignments = ["Left", "Center", "Right"];
        let svgElementsArr;
        for(let j=0; j<tempAlignments.length; j++){
            svgElementsArr = document.querySelectorAll(`.${tempAlignments[j]}SvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#9A949B";
            }
        }
    }
    const ELEMENTS_ARRAY = document.querySelectorAll(`.${textTool.textAlignment}SvgElement`);
    for(i=0; i<ELEMENTS_ARRAY.length; i++){
        ELEMENTS_ARRAY[i].style.fill = "#682375";
    }
}
function changeTextStyle(t){
    if (t != undefined){
        if (textTool[`${t.id}`]){
            textTool[`${t.id}`] = false;
        }
        else{
            textTool[`${t.id}`] = true;
        }
    }
    let svgElementsArr;
        if(textTool.bold){
            svgElementsArr = document.querySelectorAll(`.BoldSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#682375";
            }
        }
        else{
            svgElementsArr = document.querySelectorAll(`.BoldSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#9A949B";
            }
        }

        if(textTool.italic){
            svgElementsArr = document.querySelectorAll(`.ItalicSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#682375";
            }
        }
        else{
            svgElementsArr = document.querySelectorAll(`.ItalicSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#9A949B";
            }
        }

        if(textTool.underlined){
            svgElementsArr = document.querySelectorAll(`.UnderlinedSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#682375";
            }
        }
        else{
            svgElementsArr = document.querySelectorAll(`.UnderlinedSvgElement`);
            for(i=0; i<svgElementsArr.length; i++){
                svgElementsArr[i].style.fill = "#9A949B";
            }
        }
}
function saveText(t){
    textTool.text = t.value;
}

//Tool buttons color change
function changeToolButtonColor(t){
    const ELEMENTS_ARRAY = document.querySelectorAll(`.${t.id.slice(0,3)}SvgElement`);
    for(i=0; i<ELEMENTS_ARRAY.length; i++){
        ELEMENTS_ARRAY[i].style.fill = "#682375";
    }
}
function reverseToolButtonColor(){
    const ELEMENTS_ARRAY = document.querySelectorAll(`.${selectedTool}SvgElement`);
    for(i=0; i<ELEMENTS_ARRAY.length; i++){
        ELEMENTS_ARRAY[i].style.fill = "#9A949B";
    }
}

//Colors
function setColorFromLibrary(t){
    if (t.id.slice(0,4) == "User"){
        let rgb = t.style.backgroundColor.split(", ");
        rgb[0] = rgb[0].slice(4);
        rgb[2] = rgb[2].slice(0, rgb[2].length-1);
        selectedColorPicker.value = rgbToHex(rgb[0], rgb[1], rgb[2]);
        selectedColorHexInput.value = rgbToHex(rgb[0], rgb[1], rgb[2]);
    }
    else{
        selectedColorPicker.value = t.getAttribute("hex-data");
        selectedColorHexInput.value = t.getAttribute("hex-data");
    }
    ctx.strokeStyle = selectedColorPicker.value
    selectedColorBox.style.borderColor = selectedColorPicker.value
}
function setWithColorPicker(){
    selectedColorHexInput.value = selectedColorPicker.value;
    ctx.strokeStyle = selectedColorPicker.value
    selectedColorBox.style.borderColor = selectedColorPicker.value
}
function setColorWithHex(){
    selectedColorPicker.value = selectedColorHexInput.value;
    ctx.strokeStyle = selectedColorPicker.value
    selectedColorBox.style.borderColor = selectedColorPicker.value
}
function copyHex(){
    navigator.clipboard.writeText(selectedColorHexInput.value);
}
function setFillColor(t){
    shapeTool.shapeFillColor = t.value;
    ctx.fillStyle = t.value;
}
function setFillColorFromPrimary(){
    document.getElementById("InputFillColor").value = selectedColorPicker.value;
    shapeTool.shapeFillColor = document.getElementById("InputFillColor").value;
}

//Popups
function openCreateFilePopup(){
    document.activeElement.blur();
    let confirmDeletion = true
    if (canvas.width > 0 || canvas.height > 0){
        confirmDeletion = confirm("⚠The previous canvas will be erased. Are you sure you want to continue?");
    }
    if (confirmDeletion){
        document.getElementById("BackgroundDim").style.display = "flex";
        document.getElementById("FileCreationPopup").style.display = "block";
    }
    removeSelection();
}
function closePopup(boolean){
    if(boolean){
        let isConfirmed = confirm("⚠Preferences have not been saved. Are you sure you want to continue?")
        if (isConfirmed){
            loadUserPreferences();
            closePopup();
        }
    }
    else{
        document.getElementById("BackgroundDim").style.display = "none";
        document.getElementById("FileCreationPopup").style.display = "none";
        document.getElementById("ShadowPropertiesPopup").style.display = "none";
        document.getElementById("PreferencesPopup").style.display = "none";
        document.getElementById("ChangelogPopup").style.display = "none";

        document.getElementById("WidthInput").value = canvasProperties.width;
        document.getElementById("HeightInput").value = canvasProperties.height;
        document.getElementById("TransparentCanvasCheckbox").checked = canvasProperties.isTransparentBackground;
        document.getElementById("CanvasBackgroundInput").value = canvasProperties.backgroundColor;
        showCanvasBackgroundBox(document.getElementById("TransparentCanvasCheckbox"));
    }
    
}
function swapValues(){
    let temp = document.getElementById("HeightInput").value;
    document.getElementById("HeightInput").value = document.getElementById("WidthInput").value;
    document.getElementById("WidthInput").value = temp;
}
function showCanvasBackgroundBox(t){
    if (!t.checked){
        document.getElementById("CanvasBackgroundColorInputBox").style.display = "inline";
        document.getElementById("FileCreationPopup").style.height = "330px"
    }
    else{
        document.getElementById("CanvasBackgroundColorInputBox").style.display = "none";
        document.getElementById("FileCreationPopup").style.height = "270px"
    }
}

//Shadows
function openShadowPropertiesPopup(applyTo, action){
    removeSelection();
    document.activeElement.blur();
    shadowPreviewCanvas.width = 250; //clear canvas
    document.getElementById("BackgroundDim").style.display = "flex";
    document.getElementById("ShadowPropertiesPopup").style.display = "block";
    let offsetXInput = document.getElementById("OffsetXInput");
    let offsetYInput = document.getElementById("OffsetYInput");
    let shadowBlurInput = document.getElementById("ShadowBlurInput");
    let shadowColorInput = document.getElementById("ShadowColorInput");
    let shadowOpacityInput = document.getElementById("ShadowOpacityInput");
    let shadowCheckbox = document.getElementById("EnableShadowCheckbox");

    let tool;

    if (action == "open"){
        if (applyTo == "text"){
            tool = textTool;
        }
        else if(applyTo == "shape"){
            tool = shapeTool;
        }
        shadowCheckbox.checked = !(tool.shadowColor == "rgba(0, 0, 0, 0)"); //Setting values to Shadow preview popup and shadow preview canvas
        spctx.shadowOffsetX = tool.shadowOffsetX;
        offsetXInput.value = tool.shadowOffsetX;
        spctx.shadowOffsetY = tool.shadowOffsetY;
        offsetYInput.value = tool.shadowOffsetY;
        spctx.shadowBlur = tool.shadowBlur;
        shadowBlurInput.value = tool.shadowBlur;
        shadowOpacityInput.value = tool.shadowOpacity;
        shadowColorInput.value = tool.rawShadowColor;
        if (shadowCheckbox.checked){
            spctx.shadowColor = `rgba(${hexToRgb(shadowColorInput.value)}, ${shadowOpacityInput.value/100})`;
        }

        if (applyTo == "text"){ //Creating text on canvas
            let textStyles = "";
            if (textTool.bold){textStyles += "bold "};
            if (textTool.italic){textStyles += "italic "};
            spctx.fillStyle = selectedColorPicker.value;
            spctx.font = `${textStyles} ${textTool.fontSize}px ${textTool.font}`;
            spctx.textAlign = "center";
    
            spctx.fillText("Lorem ipsum", 125, 110);

            offsetXInput.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            offsetYInput.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            shadowBlurInput.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            shadowColorInput.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            shadowOpacityInput.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            shadowCheckbox.onchange = function(){openShadowPropertiesPopup('text', 'modify')};
            document.getElementById("ApplyShadowButton").onclick = function(){confirmShadow('text')};
        }
        else if (applyTo == "shape"){
            const shape = new Path2D();
            spctx.lineWidth = shapeTool.stroke;
            spctx.strokeStyle = selectedColorPicker.value;
            spctx.lineJoin = ctx.lineJoin;
            shape.rect(62.5, 50, 125, 100)
            spctx.stroke(shape);
            if (shapeTool.fillShape){
                spctx.shadowColor = "rgba(0, 0, 0, 0)"
                spctx.shadowBlur = 0;
                
                const fillShape = new Path2D();
                fillShape.rect(62.5 + spctx.lineWidth/2, 50 + spctx.lineWidth/2, 125 - spctx.lineWidth,100 - spctx.lineWidth);
                spctx.fillStyle = shapeTool.shapeFillColor;
                spctx.fill(fillShape)

                spctx.shadowBlur = tool.shadowBlur;
                spctx.shadowColor = `rgba(${hexToRgb(shadowColorInput.value)}, ${shadowOpacityInput.value/100})`;
            }

            offsetXInput.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            offsetYInput.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            shadowBlurInput.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            shadowColorInput.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            shadowOpacityInput.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            shadowCheckbox.onchange = function(){openShadowPropertiesPopup('shape', 'modify')};
            document.getElementById("ApplyShadowButton").onclick = function(){confirmShadow('shape')};
        }
    }

    else if (action == "modify"){
        if (shadowCheckbox.checked){
            //console.log(`rgba(${hexToRgb(shadowColorInput.value)}, ${shadowOpacityInput.value/100})`)
            shadowOpacityInput.value = enforceLimits(0, 100, false, shadowOpacityInput.value);
            spctx.shadowColor = `rgba(${hexToRgb(shadowColorInput.value)}, ${shadowOpacityInput.value/100})`;
            spctx.shadowBlur = enforceLimits(0, 100, false, shadowBlurInput.value);
            shadowBlurInput.value = spctx.shadowBlur
        }
        else{
            spctx.shadowColor = "rgba(0, 0, 0, 0)";
            spctx.shadowBlur = 0;
        }
        spctx.shadowOffsetX = enforceLimits(-999, 999, false, offsetXInput.value);
        offsetXInput.value = spctx.shadowOffsetX;
        spctx.shadowOffsetY = enforceLimits(-999, 999, false, offsetYInput.value);
        offsetYInput.value = spctx.shadowOffsetY;
        if (applyTo == "text"){
            let textStyles = "";
            if (textTool.bold){textStyles += "bold "};
            if (textTool.italic){textStyles += "italic "};
            spctx.fillStyle = selectedColorPicker.value;
            spctx.font = `${textStyles} ${textTool.fontSize}px ${textTool.font}`;
            spctx.textAlign = "center";
    
            spctx.fillText("Lorem ipsum", 125, 110);
        }
        else if (applyTo == "shape"){
            const shape = new Path2D();
            spctx.lineWidth = shapeTool.stroke;
            spctx.strokeStyle = selectedColorPicker.value;
            spctx.lineJoin = ctx.lineJoin;
            shape.rect(62.5, 50, 125, 100)
            spctx.stroke(shape);
            if (shapeTool.fillShape){
                spctx.shadowColor = "rgba(0, 0, 0, 0)"
                spctx.shadowBlur = 0;

                const fillShape = new Path2D();
                fillShape.rect(62.5 + spctx.lineWidth/2, 50 + spctx.lineWidth/2, 125 - spctx.lineWidth,100 - spctx.lineWidth);
                spctx.fillStyle = shapeTool.shapeFillColor;
                spctx.fill(fillShape)

                spctx.shadowBlur = shapeTool.shadowBlur;
                spctx.shadowColor = `rgba(${hexToRgb(shadowColorInput.value)}, ${shadowOpacityInput.value/100})`;
            }
        }
    }
    
}
function confirmShadow(applyTo){
    document.getElementById("BackgroundDim").style.display = "none";
    document.getElementById("ShadowPropertiesPopup").style.display = "none";
    let tool;

    if (applyTo == "text"){
        tool = textTool;
    }
    else if(applyTo == "shape"){
        tool = shapeTool;
    }

    tool.shadowOffsetX = spctx.shadowOffsetX;
    tool.shadowOffsetY = spctx.shadowOffsetY;
    tool.shadowBlur = spctx.shadowBlur;
    tool.rawShadowColor = document.getElementById("ShadowColorInput").value;
    tool.shadowOpacity = document.getElementById("ShadowOpacityInput").value;
    tool.shadowColor = spctx.shadowColor;
}

//Preferences
function openPreferencesPopup(){
    document.activeElement.blur();
    clearPreviewCanvas();
    removeSelection();
    document.getElementById("BackgroundDim").style.display = "flex";
    document.getElementById("PreferencesPopup").style.display = "block";
}
function applyPreferences(){
    let arrowIncrementDistanceInput = document.getElementById("ArrowIncrementDistanceInput");
    let ActionHistoryLimitInput = document.getElementById("ActionHistoryLimitInput");
    let AreaBorderThicknessInput = document.getElementById("AreaBorderThicknessInput");

    arrowIncrementDistance = enforceLimits(0.1, 999, true, arrowIncrementDistanceInput.value);
    arrowIncrementDistanceInput.value = arrowIncrementDistance;

    actionHistoryLimit = enforceLimits(5, 250, false, ActionHistoryLimitInput.value);
    ActionHistoryLimitInput.value = actionHistoryLimit;

    areaBorderThickness = enforceLimits(5, 50, false, AreaBorderThicknessInput.value);
    AreaBorderThicknessInput.value = areaBorderThickness;

    document.cookie = `AID=${arrowIncrementDistance}; path=/`;
    document.cookie = `AHL=${actionHistoryLimit}; path=/`;
    document.cookie = `ABT=${areaBorderThickness}; path=/`;

    closePopup();
}
function resetUserPreferences(){
    document.getElementById("ArrowIncrementDistanceInput").value = 1;
    document.getElementById("ActionHistoryLimitInput").value = 25;
    document.getElementById("AreaBorderThicknessInput").value = 12;
}
async function openChangelogPopup(){
    document.getElementById("BackgroundDim").style.display = "flex";
    document.getElementById("PreferencesPopup").style.display = "none";
    document.getElementById("ChangelogPopup").style.display = "block";

    let fetchedData = await fetch("changelog.txt");
    let changelog = await fetchedData.text();
    document.getElementById("ChangelogTextarea").value = changelog;
}

//File actions
function createCanvas(clearHistory){
    let width = canvasProperties.width = enforceLimits(8, Infinity, false, document.getElementById("WidthInput").value);
    let height = canvasProperties.height = enforceLimits(8, Infinity, false, document.getElementById("HeightInput").value);
    canvasContainer.style.width = width+"px";
    canvasContainer.style.height = height+"px";
    canvas.width = previewCanvas.width = width;
    canvas.height = previewCanvas.height = height;

    ctx.strokeStyle = selectedColorPicker.value;

    if (document.getElementById("TransparentCanvasCheckbox").checked == false){
        canvasProperties.isTransparentBackground = false;
        let canvasBackgroundShape = new Path2D();
        canvasBackgroundShape.rect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = canvasProperties.backgroundColor = document.getElementById("CanvasBackgroundInput").value;
        ctx.fill(canvasBackgroundShape);
    }
    else{
        canvasProperties.isTransparentBackground = true;
    }
    switch (selectedTool){
        case "PBr":
            ctx.lineWidth = paintBrush.stroke;
            changeShape();
            break;
        case "Era":
            ctx.lineWidth = eraser.stroke;
            changeShape();
            break;
        case "STo":
            ctx.lineWidth = shapeTool.stroke;
            changeShape();
            break;
    }

    changeShape();
    closePopup();
    if (clearHistory !== false){
        document.title = statusText.innerHTML = "Unnamed canvas - rePaint";
        undoActionsList = [];
        redoActionList = [];
        undoActionPropertiesList = [];
        redoActionPropertiesList = [];
        backgroundImage = undefined;
        FirstActionsImageData = undefined;
        changeActionButtonStatus("Undo", "off");
        changeActionButtonStatus("Redo", "off");
    }
}
function clearPreviewCanvas(){
    let width = document.getElementById("WidthInput").value;
    let height = document.getElementById("HeightInput").value;
    previewCanvas.width = width;
    previewCanvas.height = height;
}
function saveFile(){
    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    let finalName = "";
    if (statusText.innerHTML.slice(0, 7) == "Unnamed"){
        let adjective = ["Wonderful", "Stylized", "Sharp", "Detailed", "Geometric", "Futuristic", "Historic", "Vivid", "Beautiful", "Grainy", "Great", "Attractive", "Colorful", "Dramatic", "Evocative", "Digital", "Striking", "Distorted"];
        let subject = ["Painting", "Drawing", "Picture", "Sketch", "Canvas", "Portrait", "Portrayal", "Illustration", "Artwork", "Concept", "Depiction", "Visualization"];
        finalName = `${adjective[Math.round(Math.random()*17)]} ${subject[Math.round(Math.random()*11)]}.png`;
        statusText.innerHTML = `${finalName} - rePaint`;
    }
    else if(statusText.innerHTML.slice(0, 7) == "rePaint"){
        alert("❌Nothing to download. Canvas doesn't exist. ");
    }
    else{
        finalName = statusText.innerHTML.slice(0, statusText.innerHTML.length - 10);
    }
    if(statusText.innerHTML.slice(0, 7) != "rePaint"){
        link.download = finalName;
        link.click();
    }
    
}
function openFile(action, t){
    const uploadedImage = t.files[0];
    if (uploadedImage == null){
        alert("❌File wasn't selected");
    }
    else{
        const img = new Image();
        img.src = URL.createObjectURL(uploadedImage);
        img.onload = function(){
            if (action == "open"){
                let confirmDeletion = true
                if (canvas.width > 0 || canvas.height > 0){
                    confirmDeletion = confirm("⚠The previous canvas will be erased. Are you sure you want to continue?");
                }
                if (confirmDeletion){
                    document.getElementById("WidthInput").value = img.width;
                    document.getElementById("HeightInput").value = img.height;
                    createCanvas(true);
                    ctx.globalCompositeOperation = "source-over";
                    ctx.drawImage(img, 0 ,0);
                    backgroundImage = img;
                    document.title = statusText.innerHTML = `${uploadedImage.name} - rePaint`;
                }
            }
    
            if (action == "insert" && (canvas.height < img.height || canvas.width < img.width)){
                alert("❌Image resolution is higher than canvas size");
            }
            else if(action == "insert"){
                ctx.globalCompositeOperation = "source-over";
                ctx.drawImage(img, 0 ,0);
                selectionBoxPoints = [[0, 0],[img.width, img.height]]
                createSelectionArea();
                saveAction(img, "insert");
            }
            
        };
        document.getElementById("SelButton").click();
    }
}

//Load user saved content
function loadUserColors(){
    let rawCookies = document.cookie.split("; ");
    let rows = [];
    
    for (let i=0; i<rawCookies.length; i++){
        if (rawCookies[i].slice(0,3) == `UsC`){
            rows.push(rawCookies[i])
        }
    }
    if (rows[0].slice(0, 4) == "UsC2"){
        rows.push(rows.shift());
    }
    let cells = []
    cells[0] = rows[0].split("!");
    cells[1] = rows[1].split("!");
    cells[0][0] = cells[0][0].slice(5);
    cells[1][0] = cells[1][0].slice(5);
    for(let j=0; j<2; j++){
        for(let i=0; i<7; i++){
            let currentCell = document.getElementById(`UserColor${j+1}-${i+1}`);
            currentCell.style.backgroundColor = cells[j][i];
        }
    }
}
function saveUserColor(t){
    t.style.backgroundColor = selectedColorPicker.value;
    let raw = "";
    for(let j=1; j<3; j++){
        for(let i=1; i<8; i++){
            let currentCell = document.getElementById(`UserColor${j}-${i}`);
            if (i!=7){
                raw = raw + currentCell.style.backgroundColor + "!";
            }
            else{
                raw = raw + currentCell.style.backgroundColor
            }
        }
        document.cookie = `UsC${j}=${raw}; path=/` //UsC1 - UserColorsRaw1
        raw = [];
    }

}
function loadUserPreferences(){
    let rawCookies = document.cookie.split("; ");
    let arrowIncrementDistanceCookie = undefined;
    let actionHistoryLimitCookie = undefined;
    let areaBorderThicknessCookie = undefined;
    for (let i=0; i<rawCookies.length; i++){
        if (rawCookies[i].slice(0, 3) == "AID"){
            arrowIncrementDistanceCookie = rawCookies[i];
            continue;
        }
        if (rawCookies[i].slice(0, 3) == "AHL"){
            actionHistoryLimitCookie = rawCookies[i];
            continue;
        }
        if (rawCookies[i].slice(0, 3) == "ABT"){
            areaBorderThicknessCookie = rawCookies[i];
            continue;
        }
    }
    if (arrowIncrementDistanceCookie != undefined){
        arrowIncrementDistance = Number(arrowIncrementDistanceCookie.slice(4));
        document.getElementById("ArrowIncrementDistanceInput").value = arrowIncrementDistance;
    }
    if (actionHistoryLimitCookie != undefined){
        actionHistoryLimit = Number(actionHistoryLimitCookie.slice(4));
        document.getElementById("ActionHistoryLimitInput").value = actionHistoryLimit;
    }
    if (areaBorderThicknessCookie != undefined){
        areaBorderThickness = Number(areaBorderThicknessCookie.slice(4));
        document.getElementById("AreaBorderThicknessInput").value = areaBorderThickness;
    }
}

const Fragment = {
    canvasFragment: undefined,
    copy(){
        this.canvasFragment = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
        tempCanvas.height = this.canvasFragment.height;
        tempCanvas.width = this.canvasFragment.width;
        tctx.putImageData(this.canvasFragment, 0, 0);
        tempCanvas.toBlob(function(blob){
            navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": blob
                })
            ]);
        });
        this.canvasFragment = undefined;
        const statusTooltip = statusText._tippy;
        statusTooltip.show();
        setTimeout(function(){statusTooltip.hide()}, 1500);
    },
    async paste(){
        const clipboardContents = await navigator.clipboard.read();
        for (const item of clipboardContents) {
            if (canvas.width != 0){
                try{
                    const blob = await item.getType("image/png");
                    const img = new Image();
                    img.src = URL.createObjectURL(blob);
                    img.onload = () => {
                        ctx.globalCompositeOperation = "source-over";
                        ctx.drawImage(img, 0, 0);
                        document.getElementById("SelButton").click();

                        selectionBoxPoints = [[0, 0], [img.width, img.height]];
                        createSelectionArea();
                    }
                }catch{alert("❌The last clipboard item isn't an image/png");}
            }
            else{
                alert("❌Insertion action is impossible. Canvas doesn't exist");
            }
        }
    },
    cut(){
        this.canvasFragment = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
        tempCanvas.height = this.canvasFragment.height
        tempCanvas.width = this.canvasFragment.width
        tctx.putImageData(this.canvasFragment, 0, 0);
        tempCanvas.toBlob(function(blob){
            navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": blob
                })
            ]);
        });
        this.canvasFragment = undefined;
        
        ctx.globalCompositeOperation = "destination-out";
        clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
        removeSelection();
        const statusTooltip = statusText._tippy;
        statusTooltip.show();
        setTimeout(function(){statusTooltip.hide()}, 1500);
        changeActionButtonStatus("Copy", "off");
        ChangeActionButtonStatus("Cut", "off");
    },
    mirror(t){
        if(selectionBoxPoints != ""){
            tempCanvas.height = selectionBoxPoints[1][1]-selectionBoxPoints[0][1];
            tempCanvas.width = selectionBoxPoints[1][0]-selectionBoxPoints[0][0];
            if (t.id == "horizontal"){
            tctx.scale(-1, 1);
            tctx.translate(-tempCanvas.width, 0);
            }
            else if(t.id == "vertical"){
            tctx.scale(1, -1);
            tctx.translate(0, -tempCanvas.height);
            }

            tctx.drawImage(canvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1], 
            selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
            selectionBoxPoints[1][1]-selectionBoxPoints[0][1],
            0, 0, selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
                selectionBoxPoints[1][1]-selectionBoxPoints[0][1],)

            clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0]  [1])
            ctx.globalCompositeOperation = "source-over";

            ctx.drawImage(tempCanvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1]);
            saveAction([selectionBoxPoints, t.id], "mirrorArea");
        }
        else{
            alert("❌Nothing to mirror. The selection area is undefined.");
        }
    },
    rotate(t){
        if(selectionBoxPoints != ""){
            let longerLength;
            let shorterLength;
            if ((selectionBoxPoints[1][0]-selectionBoxPoints[0][0])>(selectionBoxPoints[1][1]-selectionBoxPoints[0][1])){
                longerLength = selectionBoxPoints[1][0]-selectionBoxPoints[0][0];
                shorterLength = selectionBoxPoints[1][1]-selectionBoxPoints[0][1];
            }
            else{
                longerLength = selectionBoxPoints[1][1]-selectionBoxPoints[0][1];
                shorterLength = selectionBoxPoints[1][0]-selectionBoxPoints[0][0];
            }
            tempCanvas.height = tempCanvas.width = longerLength;
            if (t.id == "clockwise"){
                tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                tctx.rotate(Math.PI/2);
                
            }
            else if(t.id == "counterclockwise"){
                tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                tctx.rotate(Math.PI*1.5);
            }

            tctx.drawImage(canvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1], 
            selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
            selectionBoxPoints[1][1]-selectionBoxPoints[0][1],
            Math.floor(-(selectionBoxPoints[1][0]-selectionBoxPoints[0][0])/2),
            Math.floor(-(selectionBoxPoints[1][1]-selectionBoxPoints[0][1])/2),
            selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
            selectionBoxPoints[1][1]-selectionBoxPoints[0][1],)

            clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0]  [1])
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(tempCanvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1]);
            saveAction([structuredClone(selectionBoxPoints), t.id], "rotateArea");

            let lengthOfEmptySpace = longerLength-shorterLength;
            if ((selectionBoxPoints[1][0]-selectionBoxPoints[0][0])>(selectionBoxPoints[1][1]-selectionBoxPoints[0][1])){
                selectionBoxPoints[0][0]+=Math.floor(lengthOfEmptySpace/2);
                selectionBoxPoints[1][0]-=Math.floor(lengthOfEmptySpace/2);
                selectionBoxPoints[1][1] = selectionBoxPoints[0][1] + longerLength;
            }
            else{
                selectionBoxPoints[0][0];
                selectionBoxPoints[1][0]+=lengthOfEmptySpace;
                selectionBoxPoints[0][1]+=Math.floor(lengthOfEmptySpace/2);
                selectionBoxPoints[1][1] = selectionBoxPoints[0][1] + shorterLength;
            }
            createSelectionArea();
        }
        else{
            alert("❌Nothing to rotate. The selection area is undefined.");
        }
    }
};

function changeActionButtonStatus(buttonId, status){
    const ELEMENTS_ARRAY = document.querySelectorAll(`.${buttonId}SvgElement`);
    const button = document.getElementById(`${buttonId}Button`);
    if (status == "on"){
        for(i=0; i<ELEMENTS_ARRAY.length; i++){
            ELEMENTS_ARRAY[i].style.fill = "#682375";
        }
        switch (buttonId){
            case "Undo":
                button.onclick = function(){undoLastAction()};
                break;
            case "Redo":
                button.onclick = function(){redoLastAction()};
                break;
            case "Copy":
                button.onclick = function(){Fragment.copy()};
                break;
            case "Cut":
                button.onclick = function(){Fragment.cut()};
                break;
        }
    }
    else if(status == "off"){
        for(i=0; i<ELEMENTS_ARRAY.length; i++){
            ELEMENTS_ARRAY[i].style.fill = "#9A949B";
        }
        button.onclick = undefined;
    }
}

//Action history
function saveAction(action, customTool){
    let tool;
    if (customTool != undefined){
        tool = customTool
    }
    else{
        tool = selectedTool
    }
    undoActionsList.push(action);

    let lastActionProperties = [ctx.strokeStyle, ctx.lineCap, ctx.lineJoin, ctx.lineWidth, ctx.globalCompositeOperation, tool, shapeTool.shape, shapeTool.fillShape,  shapeTool.shapeFillColor, lastRadius, ctx.font, ctx.textAlign, ctx.shadowOffsetX, ctx.shadowOffsetY, ctx.shadowBlur, ctx.shadowColor, textTool.textOpacity, shapeTool.opacity, isHoldingShift];
    undoActionPropertiesList.push(lastActionProperties);
    console.log("Tool properties saved");

    changeActionButtonStatus("Undo", "on");
    redoActionList = []
    redoActionPropertiesList = [];
    changeActionButtonStatus("Redo", "off");
}
function undoLastAction(){
    changeActionButtonStatus("Copy", "off");
    changeActionButtonStatus("Cut", "off");
    removeSelection();
    let numberOfActionsForDeletion = undefined;
    createCanvas(false);
    if (backgroundImage != null){
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(backgroundImage, 0, 0);
    }
    if (FirstActionsImageData != undefined){
        ctx.putImageData(FirstActionsImageData, 0, 0);
    }
    if ((undoActionsList.length-1) > actionHistoryLimit){
        numberOfActionsForDeletion = (undoActionsList.length-1) - actionHistoryLimit;
    }
    for(i=0; i<undoActionsList.length-1; i++){
        let actionShape, actionType;

        [ctx.strokeStyle, ctx.lineCap, ctx.lineJoin, ctx.lineWidth,  ctx.globalCompositeOperation, actionType, actionShape, ctx.shadowOffsetX, ctx.shadowOffsetY, ctx.shadowBlur, ctx.shadowColor] = [undoActionPropertiesList[i][0], undoActionPropertiesList[i][1], undoActionPropertiesList[i][2], undoActionPropertiesList[i][3], undoActionPropertiesList[i][4], undoActionPropertiesList[i][5], undoActionPropertiesList[i][6], undoActionPropertiesList[i][12], undoActionPropertiesList[i][13], undoActionPropertiesList[i][14], undoActionPropertiesList[i][15]];
        switch (actionType){
            case "PBr":
            case "Era":
                let isNewPath = false;
                ctx.beginPath();
                for(j=0; j<undoActionsList[i].length; j++){
                    let cursorLocations = undoActionsList[i][j].split("; ");
                    if (isNewPath == true){
                        ctx.beginPath();
                        ctx.moveTo(cursorLocations[0], cursorLocations[1]);
                        isNewPath = false;
                    }
                    ctx.lineTo(cursorLocations[0], cursorLocations[1]);
                    ctx.stroke();
                    if (cursorLocations[2] == "true"){
                        isNewPath = true;
                    }
                }
                break;
            case "STo":
                let undoShapePoints = undoActionsList[i];
                let wasHoldingShift = undoActionPropertiesList[i][18];
                const strokeShape = new Path2D();
                switch (actionShape){
                    case "rectangle":
                        if(wasHoldingShift){
                            if(Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]) > Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1])){
                                squareSide = Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]);
                            }
                            else{
                                squareSide = Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1]);
                            }
                            strokeShape.rect(undoShapePoints[0][0], undoShapePoints[0][1],
                                ((undoShapePoints[1][0]-undoShapePoints[0][0])/Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]))*squareSide, 
                                ((undoShapePoints[1][1]-undoShapePoints[0][1])/Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1]))*squareSide);
                        
                        }
                        else{
                            strokeShape.rect(undoShapePoints[0][0], undoShapePoints[0][1], undoShapePoints[1][0]-undoShapePoints[0][0], undoShapePoints[1][1]-undoShapePoints[0][1]);    
                        }
                        break;
                    case "circle":
                        let radius = undoActionPropertiesList[i][9];
                        strokeShape.arc(undoShapePoints[0][0], undoShapePoints[0][1], radius, 0, 2*Math.PI, false);
                        break;
                    case "line":
                        strokeShape.moveTo(undoShapePoints[0][0], undoShapePoints[0][1]);
                        strokeShape.lineTo(undoShapePoints[1][0], undoShapePoints[1][1]);
                        break;
                    case "polygon":
                        strokeShape.moveTo(undoShapePoints[0][0], undoShapePoints[0][1])
                        for (let i=1; i<undoShapePoints.length; i++){
                            strokeShape.lineTo(undoShapePoints[i][0], undoShapePoints[i][1]);
                        }
                        strokeShape.closePath();
                        break;
                }
                ctx.stroke(strokeShape);
                if (undoActionPropertiesList[i][7] == true){
                    ctx.fillStyle = `rgba(${hexToRgb(undoActionPropertiesList[i][8])}, ${undoActionPropertiesList[i][17]})`;
                    const fillShape = new Path2D();
                    ctx.shadowColor = "rgba(0, 0, 0, 0)"
                    ctx.shadowBlur = 0;
                    switch (actionShape){
                        case "rectangle":
                            if(wasHoldingShift){
                                if(Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]) > Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1])){
                                    squareSide = Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]);
                                }
                                else{
                                    squareSide = Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1]);
                                }
                                fillShape.rect(undoShapePoints[0][0]+ctx.lineWidth/2, undoShapePoints[0][1]+ctx.lineWidth/2,
                                    (((undoShapePoints[1][0]-undoShapePoints[0][0])/Math.abs(undoShapePoints[1][0]-undoShapePoints[0][0]))*squareSide)-ctx.lineWidth, 
                                    (((undoShapePoints[1][1]-undoShapePoints[0][1])/Math.abs(undoShapePoints[1][1]-undoShapePoints[0][1]))*squareSide)-ctx.lineWidth);
                            
                            }
                            else{
                                fillShape.rect(undoShapePoints[0][0]+ctx.lineWidth/2,
                                    undoShapePoints[0][1]+ctx.lineWidth/2,
                                    undoShapePoints[1][0]-undoShapePoints[0][0]-ctx.lineWidth,
                                    undoShapePoints[1][1]-undoShapePoints[0][1]-ctx.lineWidth);
                            }
                            
                            break;
                        case "circle":
                            let radius = undoActionPropertiesList[i][9]-ctx.lineWidth/2;
                            fillShape.arc(undoShapePoints[0][0], undoShapePoints[0][1], radius, 0, 2*Math.PI, false);
                            break;
                        case "polygon":
                            fillShape.moveTo(undoShapePoints[0][0], undoShapePoints[0][1])
                            for (let i=1; i<undoShapePoints.length; i++){
                                fillShape.lineTo(undoShapePoints[i][0], undoShapePoints[i][1]);
                            }
                            fillShape.closePath();
                            break;
                    }
                    ctx.fill(fillShape);
                }
                break;
            case "Tex":
                ctx.font = undoActionPropertiesList[i][10];
                ctx.textAlign = undoActionPropertiesList[i][11];
                ctx.fillStyle = `rgba(${hexToRgb(ctx.strokeStyle)}, ${undoActionPropertiesList[i][16]})`;
                fillMultilineText(ctx, undoActionsList[i][0], undoActionsList[i][1], undoActionsList[i][2]);
                break;
            case "Sel":
                canvasContainer.style.cursor = "crosshair";
                removeSelection();
                clearAreaContent(undoActionsList[i][2][0], undoActionsList[i][2][1], undoActionsList[i][2][2], undoActionsList[i][2][3]);
                ctx.globalCompositeOperation = "source-over";
                ctx.putImageData(undoActionsList[i][0], undoActionsList[i][1][0], undoActionsList[i][1][1]);
                break;
            case "insert":
                ctx.globalCompositeOperation = "source-over";
                ctx.drawImage(undoActionsList[i], 0, 0)
                break;
            case "ClearSelectedArea":
                clearAreaContent(undoActionsList[i][0][0], undoActionsList[i][0][1], undoActionsList[i][1][0]-undoActionsList[i][0][0], undoActionsList[i][1][1]-undoActionsList[i][0][1]);
                break;
            case "mirrorArea":
                let selectionPoints = undoActionsList[i][0];
                tempCanvas.height = selectionPoints[1][1]-selectionPoints[0][1];
                tempCanvas.width = selectionPoints[1][0]-selectionPoints[0][0];
                if (undoActionsList[i][1] == "horizontal"){
                    tctx.scale(-1, 1);
                    tctx.translate(-tempCanvas.width, 0);
                }
                else if(undoActionsList[i][1] == "vertical"){
                    tctx.scale(1, -1);
                    tctx.translate(0, -tempCanvas.height);
                }
                
                tctx.drawImage(canvas, selectionPoints[0][0], selectionPoints[0][1], 
                    selectionPoints[1][0]-selectionPoints[0][0], 
                    selectionPoints[1][1]-selectionPoints[0][1],
                    0, 0, selectionPoints[1][0]-selectionPoints[0][0], 
                    selectionPoints[1][1]-selectionPoints[0][1],)
        
                clearAreaContent(selectionPoints[0][0], selectionPoints[0][1], selectionPoints[1][0]-selectionPoints[0][0], selectionPoints[1][1]-selectionPoints[0][1]);
                ctx.globalCompositeOperation = "source-over";

                ctx.drawImage(tempCanvas, selectionPoints[0][0], selectionPoints[0][1]);
                break;
            case "rotateArea":
                let rotationSelectionPoints = undoActionsList[i][0];
                let longerLength;
                let shorterLength;
                if ((rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0])>(rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])){
                    longerLength = rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0];
                    shorterLength = rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1];
                }
                else{
                    longerLength = rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1];
                    shorterLength = rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0];
                }
                tempCanvas.height = tempCanvas.width = longerLength;
                if (undoActionsList[i][1] == "clockwise"){
                    tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                    tctx.rotate(Math.PI/2);
                }
                else if(undoActionsList[i][1] == "counterclockwise"){
                    tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                    tctx.rotate(Math.PI*1.5);
                }
            
                tctx.drawImage(canvas, rotationSelectionPoints[0][0], rotationSelectionPoints[0][1], 
                rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], 
                rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1],
                Math.floor(-(rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0])/2),
                Math.floor(-(rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])/2),
                rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], 
                rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1],)
                
                clearAreaContent(rotationSelectionPoints[0][0], rotationSelectionPoints[0][1], rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])
                ctx.globalCompositeOperation = "source-over";
                ctx.drawImage(tempCanvas, rotationSelectionPoints[0][0], rotationSelectionPoints[0][1]);
                break;
        }
        if (numberOfActionsForDeletion === i){
            FirstActionsImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for(let j=0; j<numberOfActionsForDeletion; j++){
                undoActionsList.shift()
                undoActionPropertiesList.shift();
            }
            i=0;
        }
    }
    redoActionList.push(undoActionsList.pop());
    const beforeUndoToolProperties = undoActionPropertiesList.pop();
    ctx.strokeStyle = selectedColorPicker.value;
    ctx.lineCap = beforeUndoToolProperties[1];
    ctx.lineJoin = beforeUndoToolProperties[2];
    ctx.lineWidth = beforeUndoToolProperties[3];
    ctx.globalCompositeOperation = beforeUndoToolProperties[4];
    ctx.fillStyle = beforeUndoToolProperties[8];
    redoActionPropertiesList.push(beforeUndoToolProperties);
    if (undoActionsList.length == 0){
        changeActionButtonStatus("Undo", "off");
    }
    if (redoActionList.length != 0){
        changeActionButtonStatus("Redo", "on");
    }
}
function redoLastAction(){
    changeActionButtonStatus("Copy", "off");
    changeActionButtonStatus("Cut", "off");
    let lastActionPropIndex = redoActionPropertiesList.length - 1;
    let lastActionIndex = redoActionList.length - 1;

    let actionShape, actionType;
    [ctx.strokeStyle, ctx.lineCap, ctx.lineJoin, ctx.lineWidth, ctx.globalCompositeOperation, actionType, actionShape, ctx.shadowOffsetX, ctx.shadowOffsetY, ctx.shadowBlur, ctx.shadowColor] = [redoActionPropertiesList[lastActionPropIndex][0], redoActionPropertiesList[lastActionPropIndex][1], redoActionPropertiesList[lastActionPropIndex][2], redoActionPropertiesList[lastActionPropIndex][3], redoActionPropertiesList[lastActionPropIndex][4], redoActionPropertiesList[lastActionPropIndex][5], redoActionPropertiesList[lastActionPropIndex][6], redoActionPropertiesList[lastActionPropIndex][12], redoActionPropertiesList[lastActionPropIndex][13], redoActionPropertiesList[lastActionPropIndex][14], redoActionPropertiesList[lastActionPropIndex][15]];
    switch (actionType){
        case "PBr":
        case "Era":
            let isNewPath = false;
            ctx.beginPath();
            for(j=0; j<redoActionList[lastActionIndex].length; j++){
                let cursorLocations = redoActionList[lastActionIndex][j].split("; ");
                if (isNewPath == true){
                    ctx.beginPath();
                    ctx.moveTo(cursorLocations[0], cursorLocations[1]);
                    isNewPath = false;
                }
                ctx.lineTo(cursorLocations[0], cursorLocations[1]);
                ctx.stroke();
                if (cursorLocations[2] == "true"){
                    isNewPath = true;
                }
            }
            break;
        case "STo":
            let redoShapePoints = redoActionList[lastActionIndex];
            let wasHoldingShift = redoActionPropertiesList[lastActionPropIndex][18];
            const strokeShape = new Path2D();
            switch (actionShape){
                case "rectangle":
                    if(wasHoldingShift){
                        if(Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]) > Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1])){
                            squareSide = Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]);
                        }
                        else{
                            squareSide = Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1]);
                        }
                        strokeShape.rect(redoShapePoints[0][0], redoShapePoints[0][1],
                            ((redoShapePoints[1][0]-redoShapePoints[0][0])/Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]))*squareSide, 
                            ((redoShapePoints[1][1]-redoShapePoints[0][1])/Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1]))*squareSide);
                    }
                    else{
                        strokeShape.rect(redoShapePoints[0][0], redoShapePoints[0][1], redoShapePoints[1][0]-redoShapePoints[0][0], redoShapePoints[1][1]-redoShapePoints[0][1]);
                    }
                    break;
                case "circle":
                    let radius = redoActionPropertiesList[redoActionPropertiesList.length - 1][9];
                    strokeShape.arc(redoShapePoints[0][0], redoShapePoints[0][1], radius, 0, 2*Math.PI, false);
                    break;
                case "line":
                    strokeShape.moveTo(redoShapePoints[0][0], redoShapePoints[0][1]);
                    strokeShape.lineTo(redoShapePoints[1][0], redoShapePoints[1][1]);
                    break;
                case "polygon":
                    strokeShape.moveTo(redoShapePoints[0][0], redoShapePoints[0][1])
                    for (let i=1; i<redoShapePoints.length; i++){
                        strokeShape.lineTo(redoShapePoints[i][0], redoShapePoints[i][1]);
                    }
                    strokeShape.closePath();
                    break;
            }
            ctx.stroke(strokeShape);
            if (redoActionPropertiesList[lastActionPropIndex][7] == true){
                ctx.fillStyle = `rgba(${hexToRgb(redoActionPropertiesList[lastActionPropIndex][8])}, ${redoActionPropertiesList[lastActionPropIndex][17]})`;
                const fillShape = new Path2D();
                ctx.shadowColor = "rgba(0, 0, 0, 0)";
                ctx.shadowBlur = 0;
                switch (actionShape){
                    case "rectangle":
                        if(wasHoldingShift){
                            if(Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]) > Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1])){
                                squareSide = Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]);
                            }
                            else{
                                squareSide = Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1]);
                            }
                            fillShape.rect(redoShapePoints[0][0], redoShapePoints[0][1],
                                ((redoShapePoints[1][0]-redoShapePoints[0][0])/Math.abs(redoShapePoints[1][0]-redoShapePoints[0][0]))*squareSide, 
                                ((redoShapePoints[1][1]-redoShapePoints[0][1])/Math.abs(redoShapePoints[1][1]-redoShapePoints[0][1]))*squareSide);
                        }
                        else{
                            fillShape.rect(redoShapePoints[0][0]+ctx.lineWidth/2,
                                redoShapePoints[0][1]+ctx.lineWidth/2,
                                redoShapePoints[1][0]-redoShapePoints[0][0]-ctx.lineWidth,
                                redoShapePoints[1][1]-redoShapePoints[0][1]-ctx.lineWidth);
                        }
                        
                        break;
                    case "circle":
                        let radius = redoActionPropertiesList[lastActionPropIndex][9]-ctx.lineWidth/2;
                        fillShape.arc(redoShapePoints[0][0], redoShapePoints[0][1], radius, 0, 2*Math.PI, false);
                        break;
                    case "polygon":
                        fillShape.moveTo(redoShapePoints[0][0], redoShapePoints[0][1])
                        for (let i=1; i<redoShapePoints.length; i++){
                            fillShape.lineTo(redoShapePoints[i][0], redoShapePoints[i][1]);
                        }
                        fillShape.closePath();
                    break;
                }
                ctx.fill(fillShape);
            }
            break;
        case "Tex":
            ctx.font = redoActionPropertiesList[lastActionIndex][10];
            ctx.textAlign = redoActionPropertiesList[lastActionIndex][11];
            ctx.fillStyle = `rgba(${hexToRgb(ctx.strokeStyle)}, ${redoActionPropertiesList[lastActionPropIndex][16]})`;;
            fillMultilineText(ctx, redoActionList[lastActionIndex][0], redoActionList[lastActionIndex][1], redoActionList[lastActionIndex][2]);
            break;
        case "Sel":
            canvasContainer.style.cursor = "crosshair";
            removeSelection();
            clearAreaContent(redoActionList[lastActionIndex][2][0], redoActionList[lastActionIndex][2][1], redoActionList[lastActionIndex][2][2], redoActionList[lastActionIndex][2][3]);
            ctx.globalCompositeOperation = "source-over";
            ctx.putImageData(redoActionList[lastActionIndex][0], redoActionList[lastActionIndex][1][0], redoActionList[lastActionIndex][1][1]);
            break;
        case "insert":
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(redoActionList[lastActionIndex], 0, 0);
            break;
        case "ClearSelectedArea":
            clearAreaContent(redoActionList[lastActionIndex][0][0], redoActionList[lastActionIndex][0][1], redoActionList[lastActionIndex][1][0], redoActionList[lastActionIndex][1][1]);
            break;
        case "mirrorArea":
            let selectionPoints = redoActionList[lastActionIndex][0];
            tempCanvas.height = selectionPoints[1][1]-selectionPoints[0][1];
            tempCanvas.width = selectionPoints[1][0]-selectionPoints[0][0];
            if (redoActionList[lastActionIndex][1] == "horizontal"){
                tctx.scale(-1, 1);
                tctx.translate(-tempCanvas.width, 0);
            }
            else if(redoActionList[lastActionIndex][1] == "vertical"){
                tctx.scale(1, -1);
                tctx.translate(0, -tempCanvas.height);
            }
            
            tctx.drawImage(canvas, selectionPoints[0][0], selectionPoints[0][1], 
                selectionPoints[1][0]-selectionPoints[0][0], 
                selectionPoints[1][1]-selectionPoints[0][1],
                0, 0, selectionPoints[1][0]-selectionPoints[0][0], 
                selectionPoints[1][1]-selectionPoints[0][1],)
        
            clearAreaContent(selectionPoints[0][0], selectionPoints[0][1], selectionPoints[1][0]-selectionPoints[0][0], selectionPoints[1][1]-selectionPoints[0][1])
            ctx.globalCompositeOperation = "source-over";

            ctx.drawImage(tempCanvas, selectionPoints[0][0], selectionPoints[0][1]);
            break;
        case "rotateArea":
            let rotationSelectionPoints = redoActionList[lastActionIndex][0];
            let longerLength;
            let shorterLength;
            if ((rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0])>(rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])){
                longerLength = rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0];
                shorterLength = rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1];
            }
            else{
                longerLength = rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1];
                shorterLength = rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0];
            }
            tempCanvas.height = tempCanvas.width = longerLength;
            if (redoActionList[lastActionIndex][1] == "clockwise"){
                tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                tctx.rotate(Math.PI/2);
            }
            else if(redoActionList[lastActionIndex][1] == "counterclockwise"){
                tctx.translate(Math.floor(tempCanvas.width/2), Math.floor(tempCanvas.height/2));
                tctx.rotate(Math.PI*1.5);
            }
        
            tctx.drawImage(canvas, rotationSelectionPoints[0][0], rotationSelectionPoints[0][1], 
            rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], 
            rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1],
            Math.floor(-(rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0])/2),
            Math.floor(-(rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])/2),
            rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], 
            rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1],)
            
            clearAreaContent(rotationSelectionPoints[0][0], rotationSelectionPoints[0][1], rotationSelectionPoints[1][0]-rotationSelectionPoints[0][0], rotationSelectionPoints[1][1]-rotationSelectionPoints[0][1])
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(tempCanvas, rotationSelectionPoints[0][0], rotationSelectionPoints[0][1]);
            break;
    }
    undoActionsList.push(redoActionList.pop());
    const beforeRedoToolProperties = redoActionPropertiesList.pop();
    ctx.strokeStyle = beforeRedoToolProperties[0];
    ctx.lineCap = beforeRedoToolProperties[1];
    ctx.lineJoin = beforeRedoToolProperties[2];
    ctx.lineWidth = beforeRedoToolProperties[3];
    ctx.globalCompositeOperation = beforeRedoToolProperties[4];
    ctx.fillStyle = beforeRedoToolProperties[8]
    undoActionPropertiesList.push(beforeRedoToolProperties);
    if (redoActionList.length == 0){
        changeActionButtonStatus("Redo", "off");
    }
    if (undoActionsList.length != 0){
        changeActionButtonStatus("Undo", "on");
    }
}

//Keyboard actions handling
function keyDown(e){
    if (textNodeContent != undefined){
        isWriting = (document.activeElement == textNodeContent);
    }
    else{
        isWriting = false
    }
    if (selectionBoxPoints.length != 0){
        if (e.code.slice(0, 5) == "Arrow"){
            let horizontalMoveDistance = arrowIncrementDistance;
            let verticalMoveDistance = arrowIncrementDistance;
            switch (e.code){
                case "ArrowLeft":
                        horizontalMoveDistance *= -1;
                        verticalMoveDistance = 0;
                        horizontallyMovedDistance += horizontalMoveDistance;
                    break;
                case "ArrowRight":
                        verticalMoveDistance = 0;
                        horizontallyMovedDistance += horizontalMoveDistance;
                    break;
                case "ArrowUp":
                        horizontalMoveDistance = 0;
                        verticalMoveDistance *= -1;
                        verticallyMovedDistance += verticalMoveDistance;
                    break;
                case "ArrowDown":
                        horizontalMoveDistance = 0;
                        verticallyMovedDistance += verticalMoveDistance;
                    break;
            }
            if ((selectionBoxPoints[0][0] + horizontalMoveDistance) > 0 && (selectionBoxPoints[0][0] + horizontalMoveDistance) < canvas.width+1 && 
            (selectionBoxPoints[1][0] + horizontalMoveDistance) > 0 && (selectionBoxPoints[1][0] + horizontalMoveDistance) < canvas.width+1 &&
            (selectionBoxPoints[0][1] + verticalMoveDistance) > 0 && (selectionBoxPoints[0][1] + verticalMoveDistance) < canvas.height+1 &&
            (selectionBoxPoints[1][1] + verticalMoveDistance) > 0 && (selectionBoxPoints[1][1] + verticalMoveDistance) < canvas.height+1){
                movedCanvasFragment = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
        
                clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
    
                ctx.putImageData(movedCanvasFragment, selectionBoxPoints[0][0] += horizontalMoveDistance, selectionBoxPoints[0][1] += verticalMoveDistance)
    
                createSelectionArea(selectionBoxPoints[0][0], selectionBoxPoints[0][1], (selectionBoxPoints[1][0] += horizontalMoveDistance) - selectionBoxPoints[0][0], (selectionBoxPoints[1][1] += verticalMoveDistance) - selectionBoxPoints[0][1])
            }
            else{
                alert("❌The selection area cannot extend beyond the canvas boundaries");
            }
        }
    }
    switch (e.code){
        case "Enter":
            let confirmButtons = document.querySelectorAll(".FinishPopupButton");
            for (let i=0; i<confirmButtons.length; i++){
                if (confirmButtons[i].parentElement.style.display != "none" && confirmButtons[i].parentElement.style.display != ""){
                    confirmButtons[i].click();
                    break;
                }
            }
            break;
        case "Shift":
            isHoldingShift = true;
            break;
    }
    if(e.keyCode == 16){
        isHoldingShift = true;
    }
}
function keyUp(e){
    if(!isWriting){
        switch (e.code){
            case "KeyB":
                if (!e.shiftKey){
                    document.getElementById("PBrButton").click();
                }
                break;
            case "KeyE":
                document.getElementById("EraButton").click();
                break;
            case "KeyS":
                if (!e.altKey){
                    document.getElementById("SelButton").click();
                }
                break; 
            case "KeyT":
                if(!e.shiftKey){document.getElementById("TexButton").click();}
                break;  
            case "KeyH":
                document.getElementById("SToButton").click();
                break;
            case "KeyI":
                document.getElementById("CPiButton").click();
                break;

            case "KeyZ":
                document.getElementById("UndoButton").click();
                break;
            case "KeyY":
                document.getElementById("RedoButton").click();
                break;
            case "KeyC":
                document.getElementById("CopyButton").click();
                break;
            case "KeyV":
                if (!e.shiftKey){
                    document.getElementById("PasteButton").click();
                }
                break;
            case "KeyX":
                document.getElementById("CutButton").click();
                break;
            case "Escape":
                removeSelection();
                canvasContainer.style.cursor = "crosshair"
                changeActionButtonStatus("Copy", "off");
                changeActionButtonStatus("Cut", "off");
                break;
            case "Backspace":
            case "Delete":
                if (selectionBoxPoints != ""){
                    clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
    
                    saveAction(selectionBoxPoints, "ClearSelectedArea");
                }
                break;
            case "Shift":
                isHoldingShift = false;
                break;
        }
        if (e.altKey){
            switch (e.code){
                case "KeyN":
                    document.getElementById("NewFileButton").click();
                    break;
                case "KeyO":
                    document.getElementById("OpenFileButton").click();
                    break;
                case "KeyI":
                    document.getElementById("InsertFileButton").click();
                    break;
                case "KeyS":
                    document.getElementById("SaveAsButton").click();
                    break;
            }
        }
        if (e.shiftKey){
            switch (e.code){
                case "KeyB":
                    try{
                        document.getElementById("bold").click();
                    }catch{}
                    break;
                case "KeyI":
                    try{
                        document.getElementById("italic").click();
                    }catch{}
                    break;
                case "KeyH":
                    try{
                        document.getElementById("horizontal").click();
                    }catch{}
                    break;
                case "KeyV":
                    try{
                        document.getElementById("vertical").click();
                    }catch{}
                    break;
                case "KeyT":
                    try{
                        document.getElementById("counterclockwise").click();
                    }catch{}
                    break;
                case "KeyR":
                    try{
                        document.getElementById("clockwise").click();
                    }catch{}
                    break;
                case "ArrowLeft":
                    try{
                        document.getElementById("Left").click();
                    }catch{}
                    break;
                case "ArrowDown":
                    try{
                        document.getElementById("Center").click();
                    }catch{}
                    break;
                case "ArrowRight":
                    try{
                        document.getElementById("Right").click();
                    }catch{}
                    break;
            }
        }
        if (e.code.slice(0, 3) == "Dig"){
            let num = e.code.slice(e.code.length-1)
            if (num<8 && num>0){
                if (e.shiftKey && e.altKey){
                    document.getElementById(`UserColor2-${num}`).click();
                }
                else if (e.altKey){
                    document.getElementById(`UserColor1-${num}`).click();
                }
                else if (e.shiftKey && e.ctrlKey){
                    document.getElementById(`DefaultColor2-${num}`).click();
                }
                else if (e.shiftKey){
                    document.getElementById(`DefaultColor1-${num}`).click();
                }
            }
        }
        if (e.code.slice(0, 5) == "Arrow"){
            let selectionBoxPointsBeforeMovement = [];
            try{selectionBoxPointsBeforeMovement.push([selectionBoxPoints[0][0] - horizontallyMovedDistance, selectionBoxPoints[0][1] - verticallyMovedDistance]);
            selectionBoxPointsBeforeMovement.push([selectionBoxPoints[1][0] - horizontallyMovedDistance, selectionBoxPoints[1][1] - verticallyMovedDistance]);

            saveAction([movedCanvasFragment, [selectionBoxPoints[0][0], selectionBoxPoints[0][1]],
                [selectionBoxPointsBeforeMovement[0][0], selectionBoxPointsBeforeMovement[0][1],
                selectionBoxPointsBeforeMovement[1][0]-selectionBoxPointsBeforeMovement[0][0],
                selectionBoxPointsBeforeMovement[1][1]-selectionBoxPointsBeforeMovement[0][1]]]);
                
            horizontallyMovedDistance = verticallyMovedDistance = 0;}catch{console.error("Selected area is undefined")}
        }
        if(e.keyCode == 16){
            isHoldingShift = false;
        }
    }
}

//Drawing
function drawStroke(X,Y,isNewPath){
    ctx.lineTo(X, Y);
    ctx.stroke();
    lineList.push(`${X}; ${Y}; ${isNewPath}`);
}
function resetPolygon(){
    shapePoints = [];
    polygon = new Path2D();
    clearPreviewCanvas();
}
function removeSelection(){
    selectionBoxPoints = [];
    for (let sideAreaPoints in borderResizeAreas.areaPoints){
        sideAreaPoints = [];
    }
    clearPreviewCanvas();
}
function clearAreaContent(...points){
    const areaToClean = new Path2D();
    ctx.globalCompositeOperation = "destination-out";
    areaToClean.rect(points[0], points[1], points[2], points[3]);
    ctx.fill(areaToClean);
}
function createSelectionArea(x,y,w,h){
    clearPreviewCanvas();
    const selectionBox = new Path2D();
    let xd1; // 1st point data (color)
    let xd2; // 2nd point data (color)
    if (x == undefined){
        xd1 = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], 1, 1).data;
        xd2 = ctx.getImageData(selectionBoxPoints[1][0], selectionBoxPoints[1][1], 1, 1).data;
        selectionBox.rect(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
    }
    else{
        xd1 = ctx.getImageData(x, y, 1, 1).data;
        xd2 = ctx.getImageData(x+w, y+h, 1, 1).data;
        selectionBox.rect(x,y,w,h);
    }

    pctx.lineWidth = 2;
    pctx.strokeStyle = `rgba(${invertRgb((xd1[0]+xd2[0])/2, (xd1[1]+xd2[1])/2, (xd1[2]+xd2[2])/2, (xd1[3]+xd2[3])/2)},1)`; // Finding average color of points and inverting them
    pctx.setLineDash([8, 5]);
    pctx.stroke(selectionBox);

    changeActionButtonStatus("Copy", "on");
    changeActionButtonStatus("Cut", "on");

    let temp = [];  //Sort selection box point. selectionBoxPoints[0] must be in a left top corner, while selectionBoxPoints[1] in right bottom
    if (selectionBoxPoints[0][0] > selectionBoxPoints[1][0]){
        temp[0] = selectionBoxPoints[0][0];
        selectionBoxPoints[0][0] = selectionBoxPoints[1][0];
        selectionBoxPoints[1][0] = temp[0];
    }
    if (selectionBoxPoints[0][1] > selectionBoxPoints[1][1]){
        temp[1] = selectionBoxPoints[0][1];
        selectionBoxPoints[0][1] = selectionBoxPoints[1][1];
        selectionBoxPoints[1][1] = temp[1];
    }
    borderResizeAreas.setBorderResizeAreas();
}
function pauseStroke(){
    if (isMouseDown && (selectedTool == "PBr" || selectedTool == "Era")){
        let pointsDistance = {x:0, y:0};
        let i = lineList.length-1; //lineList index
    
        pointsDistance.x = lineList[i].split("; ")[0] - lineList[i-1].split("; ")[0];
        pointsDistance.y = lineList[i].split("; ")[1] - lineList[i-1].split("; ")[1];

        drawStroke(Number(lineList[i].split("; ")[0]) + pointsDistance.x*5, Number(lineList[i].split("; ")[1]) + pointsDistance.y*5, true);
    }
}
function continueStroke(){
    if (isMouseDown && (selectedTool == "PBr" || selectedTool == "Era")){
        ctx.beginPath();
    }
}
function fillMultilineText(context, text, x, y){
    let strings = text.split("\n");
    for (let i=0; i<strings.length; i++){
        context.fillText(strings[i], x, y+(i*textTool.fontSize));
    }
}

//Handle mouse/pointer actions
function getCursorLocation(event){
    let rect = event.target.getBoundingClientRect();
    cursorX = Math.round(event.clientX - rect.left);
    cursorY = Math.round(event.clientY - rect.top);
    cursorLocationInput.value = `${cursorX}; ${cursorY}`;
    if (isMouseDown == true){
        if (selectedTool == "PBr" || selectedTool == "Era"){
            let tool = undefined;
            if (selectedTool == "PBr"){
                tool = paintBrush;
            }
            else if (selectedTool == "Era"){
                tool = eraser;
            }
            switch (tool.strokeQuality){
                case "original":
                    drawStroke(cursorX, cursorY);
                    break;
                case "high":
                    if (cooldown == 1){
                        drawStroke(cursorX, cursorY);
                        cooldown = 0;
                    }
                    else{
                        cooldown++;
                    }
                    break;
                case "medium":
                    if (cooldown == 3){
                        drawStroke(cursorX, cursorY);
                        cooldown = 0;
                    }
                    else{
                        cooldown++;
                    }
                    break;
                case "low":
                    if (cooldown == 5){
                        drawStroke(cursorX, cursorY);
                        cooldown = 0;
                    }
                    else{
                        cooldown++;
                    }
                    break;
            }
        }
        if (selectedTool == "Sel" && canvasContainer.style.cursor != "grab" && canvasContainer.style.cursor != "crosshair"){
            const distanceForPointsToMove = {x:0, y:0};
            tempCanvas.height = selectionBoxPoints[1][1]-selectionBoxPoints[0][1];
            tempCanvas.width = selectionBoxPoints[1][0]-selectionBoxPoints[0][0];
            switch (borderResizeAreas.pointerInArea){
                case "left":
                    distanceForPointsToMove.x = cursorX-selectionBoxPoints[0][0];
                    selectionBoxPoints[0][0]+=(distanceForPointsToMove.x+areaBorderThickness/2);
                    //tctx.scale((selectionBoxPoints[0][0]-distanceForPointsToMove.x)/selectionBoxPoints[0][0], 1);
                    //tctx.translate(selectionBoxPoints[0][0], 0);
                    break;
                case "right":
                    distanceForPointsToMove.x = cursorX-selectionBoxPoints[1][0];
                    selectionBoxPoints[1][0]+=(distanceForPointsToMove.x-areaBorderThickness/2);

                    break;
                case "top":
                    distanceForPointsToMove.y = cursorY-selectionBoxPoints[0][1];
                    selectionBoxPoints[0][1]+=(distanceForPointsToMove.y+areaBorderThickness/2);

                    break;
                case "bottom":
                    distanceForPointsToMove.y = cursorY-selectionBoxPoints[1][1];
                    selectionBoxPoints[1][1]+=(distanceForPointsToMove.y-areaBorderThickness/2);
                    
                    break;
                default:
                    borderResizeAreas.pointerInArea = undefined;
                    break;
            }
            createSelectionArea();

            

            // tctx.drawImage(canvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1], 
            //     selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
            //     selectionBoxPoints[1][1]-selectionBoxPoints[0][1],
            //     0, 0, selectionBoxPoints[1][0]-selectionBoxPoints[0][0], 
            //     selectionBoxPoints[1][1]-selectionBoxPoints[0][1],)

            // //clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
            // ctx.globalCompositeOperation = "source-over";
            
            // pctx.drawImage(tempCanvas, selectionBoxPoints[0][0], selectionBoxPoints[0][1]);
            // //saveAction([selectionBoxPoints, t.id], "mirrorArea");
        }
    }
    else{
        if (selectedTool == "PBr" || selectedTool == "Era"){
            clearPreviewCanvas();
            if (selectedTool == "PBr"){
                pctx.strokeStyle = selectedColorPicker.value;
                pctx.lineCap = paintBrush.strokeShape;
                pctx.lineWidth = paintBrush.stroke;
            }
            else if (selectedTool == "Era"){
                pctx.strokeStyle = "#f2f2f2";
                pctx.lineCap = eraser.strokeShape;
                pctx.lineWidth = eraser.stroke;
            }
            let previewStroke = new Path2D();
            previewStroke.moveTo(cursorX, cursorY);
            previewStroke.lineTo(cursorX, cursorY);
            pctx.stroke(previewStroke);
        }
    }
    if ((selectedTool == "STo" && shapePoints.length == 1) || (selectedTool == "STo" && shapeTool.shape == "polygon" && shapePoints.length > 0 && shapePoints.length != document.getElementById("InputCorners").value)){
        const shape = new Path2D();
        switch (shapeTool.shape){
            case "rectangle":
                clearPreviewCanvas();
                if(isHoldingShift){
                    let squareSide;
                    if(Math.abs(cursorX-shapePoints[0][0]) > Math.abs(cursorY-shapePoints[0][1])){
                        squareSide = Math.abs(cursorX-shapePoints[0][0]);
                    }
                    else{
                        squareSide = Math.abs(cursorY-shapePoints[0][1]);
                    }
                    shape.rect(shapePoints[0][0], shapePoints[0][1],
                        ((cursorX-shapePoints[0][0])/Math.abs(cursorX-shapePoints[0][0]))*squareSide, 
                        ((cursorY-shapePoints[0][1])/Math.abs(cursorY-shapePoints[0][1]))*squareSide);
                }
                else{
                shape.rect(shapePoints[0][0], shapePoints[0][1], cursorX-shapePoints[0][0], cursorY-shapePoints[0][1]);
                }

                break;
            case "circle":
                clearPreviewCanvas();
                shape.arc(shapePoints[0][0], shapePoints[0][1], Math.abs(pythagoras(Math.abs(shapePoints[0][0]-cursorX), Math.abs(shapePoints[0][1]-cursorY))), 0, 2*Math.PI);
                break;
            case "line":
                clearPreviewCanvas();
                shape.moveTo(shapePoints[0][0],shapePoints[0][1]);
                if (isHoldingShift){
                    if (Math.abs(cursorY-shapePoints[0][1])>Math.abs(cursorX-shapePoints[0][0])){
                        shape.lineTo(shapePoints[0][0], cursorY);
                    }
                    else{
                        shape.lineTo(cursorX, shapePoints[0][1]);
                    }
                }
                else{
                    shape.lineTo(cursorX, cursorY);
                }
                
                break;
            case "polygon":
                clearPreviewCanvas();
                shape.moveTo(shapePoints[shapePoints.length - 1][0],shapePoints[shapePoints.length - 1][1])
                shape.lineTo(cursorX, cursorY)
                break;
        }
        pctx.setLineDash([]);
        let xd = ctx.getImageData(shapePoints[0][0], shapePoints[0][1], 1, 1).data;
        pctx.strokeStyle =  `rgba(${invertRgb(xd[0], xd[1], xd[2], xd[3])},0.7)`;
        pctx.stroke(shape);

    }
    if (selectedTool == "Sel"){
        if (selectionBoxPoints.length == 1){
            clearPreviewCanvas();
            const selectionBox = new Path2D();
            selectionBox.rect(selectionBoxPoints[0][0], selectionBoxPoints[0][1], cursorX-selectionBoxPoints[0][0], cursorY-selectionBoxPoints[0][1]);
            let xd = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], 1, 1).data;
            pctx.lineWidth = 2;
            pctx.strokeStyle = `rgba(${invertRgb(xd[0], xd[1], xd[2], xd[3])},0.7)`;
            pctx.setLineDash([8, 5]);
            pctx.stroke(selectionBox);
        }

        if (selectionBoxPoints.length == 2 && isMovingFragment == false){
            if ((cursorX>selectionBoxPoints[0][0] && cursorX<selectionBoxPoints[1][0]) && (cursorY>selectionBoxPoints[0][1] && cursorY<selectionBoxPoints[1][1])){ //Set "grab" cursor when pointer is inside a selection area
                canvasContainer.style.cursor = "grab";
            }
            else if ((cursorX>borderResizeAreas.areaPoints.left[0][0] && cursorX<borderResizeAreas.areaPoints.left[1][0]) && (cursorY>borderResizeAreas.areaPoints.left[0][1] && cursorY<borderResizeAreas.areaPoints.left[1][1])){
                canvasContainer.style.cursor = "ew-resize";
                borderResizeAreas.pointerInArea = "left";
            }
            else if((cursorX>borderResizeAreas.areaPoints.right[0][0] && cursorX<borderResizeAreas.areaPoints.right[1][0]) && (cursorY>borderResizeAreas.areaPoints.right[0][1] && cursorY<borderResizeAreas.areaPoints.right[1][1])){
                canvasContainer.style.cursor = "ew-resize";
                borderResizeAreas.pointerInArea = "right";
            }
            else if ((cursorX>borderResizeAreas.areaPoints.top[0][0] && cursorX<borderResizeAreas.areaPoints.top[1][0]) && (cursorY>borderResizeAreas.areaPoints.top[0][1] && cursorY<borderResizeAreas.areaPoints.top[1][1])){
                canvasContainer.style.cursor = "ns-resize";
                borderResizeAreas.pointerInArea = "top";
            }
            else if ((cursorX>borderResizeAreas.areaPoints.bottom[0][0] && cursorX<borderResizeAreas.areaPoints.bottom[1][0]) && (cursorY>borderResizeAreas.areaPoints.bottom[0][1] && cursorY<borderResizeAreas.areaPoints.bottom[1][1])){
                canvasContainer.style.cursor = "ns-resize";
                borderResizeAreas.pointerInArea = "bottom";
            }
            else{
                canvasContainer.style.cursor = "crosshair";
                borderResizeAreas.pointerInArea = undefined
            }

        }
    }
    if (isMouseDown == true && canvasContainer.style.cursor == "grab" && selectedTool == "Sel"){
        isMovingFragment = true;
    }
    if (isMovingFragment == true && movedCanvasFragment != undefined && canvasContainer.style.cursor == "grab"){
        if (isMouseDown == true){
            clearPreviewCanvas();
            pctx.putImageData(movedCanvasFragment, cursorX-distanceXY[0], cursorY-distanceXY[1]);
        }
        else{
            isMovingFragment = false;
            ctx.globalCompositeOperation = "source-over";
            ctx.putImageData(movedCanvasFragment, cursorX-distanceXY[0], cursorY-distanceXY[1]);
    
            saveAction([movedCanvasFragment, [cursorX-distanceXY[0], cursorY-distanceXY[1]], [selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]]]);

            selectionBoxPoints = [[cursorX-distanceXY[0], cursorY-distanceXY[1]], [(cursorX-distanceXY[0])+(selectionBoxPoints[1][0]-selectionBoxPoints[0][0]), (cursorY-distanceXY[1])+(selectionBoxPoints[1][1]-selectionBoxPoints[0][1])]];
            createSelectionArea();
            distanceXY = [];
        }
    }
    if (selectedTool == "Tex"){
        if(textTool.text != ""){
            clearPreviewCanvas();
            let textStyles = "";
            if (textTool.bold){textStyles += "bold "};
            if (textTool.italic){textStyles += "italic "};
            pctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            pctx.font = `${textStyles} ${textTool.fontSize}px ${textTool.font}`;
            pctx.textAlign = (textTool.textAlignment.toLowerCase());
            fillMultilineText(pctx, textTool.text, cursorX, cursorY);
        }
    }
}
function mouseDown(){
    isMouseDown = true;
    switch (selectedTool){
        case "PBr":
        case "Era":
            clearPreviewCanvas();
            ctx.beginPath();
            break;
        case "STo":
            if (shapeTool.shape == "rectangle" || shapeTool.shape == "circle" || shapeTool.shape == "line"){
                if (shapePoints.length != 1){
                    shapePoints.push([cursorX, cursorY]);
                }
                else{
                    ctx.shadowOffsetX = shapeTool.shadowOffsetX;
                    ctx.shadowOffsetY = shapeTool.shadowOffsetY;
                    ctx.shadowBlur = shapeTool.shadowBlur;
                    ctx.shadowColor =  shapeTool.shadowColor;
    
                    shapePoints.push([cursorX, cursorY]);

                    const strokeShape = new Path2D();
                    switch (shapeTool.shape){
                        case "rectangle":
                            let temp = [];  //Sort shape points.  shapePoints[0] must be in a left bottom corner, while  shapePoints[1] in right top
                            if (shapePoints[0][0] > shapePoints[1][0]){
                                temp[0] = shapePoints[0][0];
                                shapePoints[0][0] = shapePoints[1][0];
                                shapePoints[1][0] = temp[0];
                            }
                            if (shapePoints[0][1] > shapePoints[1][1]){
                                temp[1] = shapePoints[0][1];
                                shapePoints[0][1] = shapePoints[1][1];
                                shapePoints[1][1] = temp[1];
                            }
                            if(isHoldingShift){
                                let squareSide;
                                if(Math.abs(shapePoints[1][0]-shapePoints[0][0]) > Math.abs(shapePoints[1][1]-shapePoints[0][1])){
                                    squareSide = Math.abs(shapePoints[1][0]-shapePoints[0][0]);
                                }
                                else{
                                    squareSide = Math.abs(shapePoints[1][1]-shapePoints[0][1]);
                                }
                                strokeShape.rect(shapePoints[0][0], shapePoints[0][1],
                                    ((shapePoints[1][0]-shapePoints[0][0])/Math.abs(shapePoints[1][0]-shapePoints[0][0]))*squareSide, 
                                    ((shapePoints[1][1]-shapePoints[0][1])/Math.abs(shapePoints[1][1]-shapePoints[0][1]))*squareSide);
                            }
                            else{
                                strokeShape.rect(shapePoints[0][0], shapePoints[0][1], shapePoints[1][0]-shapePoints[0][0], shapePoints[1][1]-shapePoints[0][1]);
                            }
                            break;
                        case "circle":
                            let radius = pythagoras(Math.abs(shapePoints[0][0]-shapePoints[1][0]), Math.abs(shapePoints[0][1]-shapePoints[1][1]));
                            lastRadius = radius;
                            strokeShape.arc(shapePoints[0][0], shapePoints[0][1], Math.abs(radius), 0, 2*Math.PI, false); 
                            break;
                        case "line":
                            strokeShape.moveTo(shapePoints[0][0],shapePoints[0][1]);
                            if (isHoldingShift){
                                if (Math.abs(cursorY-shapePoints[0][1])>Math.abs(cursorX-shapePoints[0][0])){
                                    strokeShape.lineTo(shapePoints[0][0], shapePoints[1][1]);
                                    shapePoints[1][0] = shapePoints[0][0];
                                }
                                else{
                                    strokeShape.lineTo(shapePoints[1][0], shapePoints[0][1]);
                                    shapePoints[1][1] = shapePoints[0][1];
                                }
                            }
                            else{
                                strokeShape.lineTo(shapePoints[1][0], shapePoints[1][1]);
                            }
                            break;
                    }
                    shapeTool.opacity = document.getElementById("ShapeOpacityInput").value / 100;
                    ctx.strokeStyle = `rgba(${hexToRgb(selectedColorPicker.value)}, ${shapeTool.opacity})`;
                    ctx.stroke(strokeShape);
                    if (shapeTool.fillShape == true){
                        ctx.shadowColor = "rgba(0, 0, 0, 0)"
                        ctx.shadowBlur = 0;
                        const fillShape = new Path2D();
                        switch (shapeTool.shape){
                            case "rectangle":
                                if(isHoldingShift){
                                    let squareSide;
                                    if(Math.abs(shapePoints[1][0]-shapePoints[0][0]) > Math.abs(shapePoints[1][1]-shapePoints[0][1])){
                                        squareSide = Math.abs(shapePoints[1][0]-shapePoints[0][0]);
                                    }
                                    else{
                                        squareSide = Math.abs(shapePoints[1][1]-shapePoints[0][1]);
                                    }
                                    fillShape.rect(shapePoints[0][0]+ctx.lineWidth/2, shapePoints[0][1]+ctx.lineWidth/2,
                                        (((shapePoints[1][0]-shapePoints[0][0])/Math.abs(shapePoints[1][0]-shapePoints[0][0]))*squareSide)-ctx.lineWidth, 
                                        (((shapePoints[1][1]-shapePoints[0][1])/Math.abs(shapePoints[1][1]-shapePoints[0][1]))*squareSide)-ctx.lineWidth);
                                    shapePoints[1][0] = (shapePoints[1][0]/Math.abs(shapePoints[1][0])*squareSide)+shapePoints[0][0];
                                    shapePoints[1][1] = (shapePoints[1][1]/Math.abs(shapePoints[1][1])*squareSide)+shapePoints[0][1];
                                }
                                else{
                                    fillShape.rect(shapePoints[0][0]+ctx.lineWidth/2,
                                    shapePoints[0][1]+ctx.lineWidth/2,
                                    (shapePoints[1][0]-shapePoints[0][0])-ctx.lineWidth,
                                    (shapePoints[1][1]-shapePoints[0][1])-ctx.lineWidth);
                                }

                                
                                break;
                            case "circle":
                                let radius = pythagoras(Math.abs(shapePoints[0][0]-shapePoints[1][0]), Math.abs(shapePoints[0][1]-shapePoints[1][1]))-ctx.lineWidth/2;
                                fillShape.arc(shapePoints[0][0], shapePoints[0][1], Math.abs(radius), 0, 2*Math.PI, false); 
                                break;
                        }
                        ctx.fillStyle = `rgba(${hexToRgb(shapeTool.shapeFillColor)}, ${shapeTool.opacity})`;
                        ctx.fill(fillShape);
                        ctx.shadowBlur = shapeTool.shadowBlur;
                        ctx.shadowColor =  shapeTool.shadowColor;
                    }
                    clearPreviewCanvas();
                }
            }
            else if(shapeTool.shape == "polygon"){
                let corners = document.getElementById("InputCorners").value;
                if (shapePoints.length == 0){
                    shapePoints.push([cursorX, cursorY]);
                    polygon.moveTo(cursorX,cursorY);
                }
                else if(shapePoints.length != 0 && shapePoints.length != corners-1){
                    shapePoints.push([cursorX, cursorY]);
                    polygon.lineTo(cursorX, cursorY);
                }
                else if (shapePoints.length == corners-1){
                    ctx.shadowOffsetX = shapeTool.shadowOffsetX;
                    ctx.shadowOffsetY = shapeTool.shadowOffsetY;
                    ctx.shadowBlur = shapeTool.shadowBlur;

                    polygon.lineTo(cursorX, cursorY);
                    polygon.closePath();

                    shapeTool.opacity = document.getElementById("ShapeOpacityInput").value / 100;

                    ctx.shadowColor =  shapeTool.shadowColor;
                    ctx.strokeStyle = `rgba(${hexToRgb(selectedColorPicker.value)}, ${shapeTool.opacity})`;

                    ctx.stroke(polygon);

                    if (shapeTool.fillShape == true){
                        ctx.shadowColor =  "rgba(0,0,0,0)";
                        ctx.fillStyle = `rgba(${hexToRgb(shapeTool.shapeFillColor)}, ${shapeTool.opacity})`;
                        ctx.fill(polygon);
                    }
                    shapePoints.push([cursorX, cursorY]);
                    polygon = new Path2D();
                    ctx.shadowColor =  shapeTool.shadowColor;
                }

            }
        break;
        case "Sel":
            if (canvasContainer.style.cursor == "crosshair"){
                if (selectionBoxPoints.length != 1){
                    removeSelection();
                    selectionBoxPoints.push([cursorX, cursorY]);
                    changeActionButtonStatus("Copy", "off");
                    changeActionButtonStatus("Cut", "off");
                }
                else{
                    selectionBoxPoints.push([cursorX, cursorY]);
                    createSelectionArea();
                }
            }
            else if(canvasContainer.style.cursor !== "crosshair" && canvasContainer.style.cursor != "ns-resize" && canvasContainer.style.cursor != "ew-resize"){
                movedCanvasFragment = ctx.getImageData(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1]);
                ctx.globalCompositeOperation = "destination-out";
                clearAreaContent(selectionBoxPoints[0][0], selectionBoxPoints[0][1], selectionBoxPoints[1][0]-selectionBoxPoints[0][0], selectionBoxPoints[1][1]-selectionBoxPoints[0][1])
                distanceXY[0] = cursorX - selectionBoxPoints[0][0];
                distanceXY[1] = cursorY - selectionBoxPoints[0][1];
            }
        break;
        case "Tex":
            if(textTool.text != ""){
                let textStyles = "";
                if (textTool.bold){textStyles += "bold "};
                if (textTool.italic){textStyles += "italic "};
                textTool.textOpacity = document.getElementById("TextOpacityInput").value / 100;

                ctx.fillStyle = `rgba(${hexToRgb(selectedColorPicker.value)}, ${textTool.textOpacity})`;
                ctx.font = `${textStyles} ${textTool.fontSize}px ${textTool.font}`;
                ctx.textAlign = (textTool.textAlignment.toLowerCase());
    
                ctx.shadowOffsetX = textTool.shadowOffsetX;
                ctx.shadowOffsetY = textTool.shadowOffsetY;
                ctx.shadowBlur = textTool.shadowBlur;
                ctx.shadowColor =  textTool.shadowColor;
    
                fillMultilineText(ctx, textTool.text, cursorX, cursorY);
                clearPreviewCanvas();
                saveAction([textTool.text, cursorX, cursorY]);
                textNodeContent.value = "";
                textTool.text = "";
            }
        break;
        case "CPi":
            let colorData = ctx.getImageData(cursorX, cursorY, 1, 1).data;
            selectedColorPicker.value = rgbToHex(colorData[0], colorData[1], colorData[2]);
            setWithColorPicker();
    }
}
function mouseUp(){
    if (isMouseDown == true){
        if (selectedTool != null && canvas.height > 0){  
            if (lineList.length != 0 || (selectedTool == "STo" && shapePoints.length == 2 && shapeTool.shape != "polygon") || (selectedTool == "STo" && shapeTool.shape == "polygon" && shapePoints.length == Number(document.getElementById("InputCorners").value))){
                if (selectedTool == "PBr" || selectedTool == "Era"){
                    saveAction(lineList);
                    lineList = [];
                }
                else if(selectedTool == "STo"){
                    saveAction(shapePoints);
                    shapePoints = [];
                    clearPreviewCanvas();
                }
            }
        }
    }
    isMouseDown = false;
}

document.addEventListener("contextmenu", event => {
    event.preventDefault();
});
//addEventListener("paste", event => {document.getElementById("PasteButton").click();});
document.addEventListener("keyup", keyUp, false);
document.addEventListener("keydown", keyDown, false);
tippy("[data-tippy-content]",{
    delay: [400, 100],
    animation: "shift-toward",
    allowHTML: true,
});
tippy("#Status", {trigger: "manual", allowHTML: true, content: "<strong>Successfully copied to the clipboard!</strong>", duration: [null, 500],});
loadUserPreferences();
try{
    loadUserColors();
}catch{console.error("An error occurred while loading user's colors")}

