<template>
<div id="in-game" class="view">
	
	<div class="toggle-game-info"></div>
	<div id="game-info" class="chunk-narrow">
		<h2 class="prompt">{{promptText}}</h2>
		<h3 class="current-turn" :style="{color: userColor}">{{whoseTurnText}}</h3>
	</div>

	<div class="chunk-narrow">
		<div id="painting">
			<canvas id="new-paint" touch-action="none" 
			@pointerdown="pdown" @pointermove="pmove" @pointerup="endStroke" @pointerout="endStroke"></canvas>
			<canvas id="old-paint"></canvas>
		</div>
	</div>

	<div id="drawing-decision" class="chunk-narrow">
		<button class="btn secondary undo-drawing" @click="undo" v-show="!roundOver" :disabled="canvasState !== 'PREVIEW'">Undo</button>
		<button class="btn primary submit-drawing" @click="submit" v-show="!roundOver" :disabled="canvasState !== 'PREVIEW'">Submit</button>
		<div style="clear: both"></div>
		<button class="btn primary big new-round"
		  @click="newRound" v-show="roundOver" :disabled="!roundOver">New Round</button>
	</div>

</div>
</template>

<script>
const Store = require('./state');
const drawingPadObjects = require('../../common/drawing-pad-objects');
const RelativePoint = drawingPadObjects.RelativePoint;
const Layer = drawingPadObjects.Layer;
const GAME_PHASE = require("../../common/game-phase");

const CanvasState = {
	'EMPTY': 'EMPTY',
	'PAINT': 'PAINT',
	'PREVIEW': 'PREVIEW',
	'SPECTATE': 'SPECTATE',
};

const drawingPad = require('./drawing-pad');

const strokeTracker = {
	points: [],
	maxCount: 5000,
	strokeLength: 0,
	addPoint: function(p) {
		if(this.points.length < this.maxCount) {
			this.points.push(p);
		}
		return this.points;
	},
	lastPoint: function() {
		let prevPt = this.points[this.points.length - 1];
		return prevPt;
	},
	reset: function() {
		this.points = [];
		this.strokeLength = 0;
	},
	validateStrokeDistance: function() { // TODO validate by relativeLength?
		if(this.points.length < 2) {
			return false;
		}
		// console.log(this.points.length);
		const minLength = 0.02;
		let dist = 0;
		for(let i=1; i<this.points.length; i++) {
			let prevPt = this.points[i-1];
			let curPt = this.points[i];
			let a = prevPt.x - curPt.x;
			let b = prevPt.y - curPt.y;
			dist += Math.sqrt(a*a + b*b);
			// console.log(dist);
			if(dist > minLength) {
				return true;
			}
		}
		return false;
	},
	hasPoints: function() {
		return this.points.length > 0;
	}
};

export default {
	name: 'GameView',
	components: {
	},
	props: {
		gameState: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			canvasState: CanvasState.SPECTATE,
			stroke: strokeTracker,
			drawingPad: drawingPad,
		};
	},
	computed: {
		promptText() {
			return `${this.gameState.keyword} (${this.gameState.hint})`;
		},
		whoseTurnText() {
			return this.gameState.phase === GAME_PHASE.ROUND_OVER ? 'Voting time!' : `${this.gameState.whoseTurn}'s turn`;
		},
		userColor() {
			return this.gameState.getUserColor(this.gameState.whoseTurn);
		},
		roundOver() {
			return this.gameState.phase === GAME_PHASE.ROUND_OVER;
		}
	},
	watch: {
		['gameState.turn']() {
			this.onNewTurn();
		}
	},
	methods: {
		onNewTurn() {
			if(this.gameState.turn === 1) {
				drawingPad.clearCanvas(Layer.BOTTOM);
			}

			let newStroke = this.gameState.getMostRecentStroke();
			if(newStroke) {
				drawingPad.drawStroke(Layer.BOTTOM, newStroke.points, this.gameState.getUserColor(newStroke.username), false);
			}
			drawingPad.clearCanvas(Layer.TOP);
			
			if(Store.myTurn()) {
				this.canvasState = CanvasState.EMPTY;
			} else {
				this.canvasState = CanvasState.SPECTATE;
			}
		},
		undo() {
			this.stroke.reset();
			drawingPad.clearCanvas(Layer.TOP);
			this.canvasState = CanvasState.EMPTY;
		},
		submit() {
			if(Store.myTurn() && this.stroke.hasPoints()) {
				Store.submitStroke(this.stroke.points);

				this.stroke.reset();
				this.canvasState = CanvasState.SPECTATE;
			}
		},
		newRound() {
			Store.submitStartGame();
		},
		pdown(e) {
			if(this.canvasState === CanvasState.EMPTY && Store.myTurn()) {
				this.canvasState = CanvasState.PAINT;
				let newPt = drawingPad.getRelativePointFromPointerEvent(e);
				strokeTracker.addPoint(newPt);
			}
		},
		pmove(e) {
			if(this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				let div = document.getElementById('new-paint');
				let lastPt = strokeTracker.lastPoint();
				let newPt = drawingPad.getRelativePointFromPointerEvent(e);
				if(!lastPt.matches(newPt)) {
					strokeTracker.addPoint(newPt);
					drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black', false);
				}
			}
		},
		endStroke(e) {
			if(this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				if(strokeTracker.validateStrokeDistance()) {
					this.canvasState = CanvasState.PREVIEW;
					let newPt = drawingPad.getRelativePointFromPointerEvent(e);
					strokeTracker.addPoint(newPt);
					drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black', true);
				} else {
					drawingPad.clearCanvas(Layer.TOP);
					this.canvasState = CanvasState.EMPTY;
					strokeTracker.reset();
				}
			}
		},
	},
	mounted() {
		this.$nextTick(function() {
			drawingPad.init();
			this.onNewTurn(); 
		});
	}
};
</script>
