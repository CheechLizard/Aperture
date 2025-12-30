export const ZOOM_SCRIPT = `
// Reusable zoom transition module
// Handles transform calculation and animation state for all zoom operations

const ZOOM_DURATION = 500;
const ZOOM_EASE = d3.easeCubicOut;

const zoom = {
  _prev: { x: 0, y: 0, kx: 1, ky: 1 },
  _curr: { x: 0, y: 0, kx: 1, ky: 1 },
  _clickedBounds: null,  // Bounds of clicked element for zoom-in animation

  // Calculate zoom transform for a target node
  calculateTransform(targetNode, width, height) {
    if (targetNode) {
      return {
        x: targetNode.x0,
        y: targetNode.y0,
        kx: width / (targetNode.x1 - targetNode.x0),
        ky: height / (targetNode.y1 - targetNode.y0)
      };
    }
    return { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Update zoom state and return prev/curr for animation
  update(targetNode, width, height) {
    this._prev = { ...this._curr };
    this._curr = this.calculateTransform(targetNode, width, height);
    return { prev: this._prev, curr: this._curr };
  },

  // Get a D3 transition configured for zoom animations
  transition(name) {
    return d3.transition(name || 'zoom')
      .duration(ZOOM_DURATION)
      .ease(ZOOM_EASE);
  },

  // Calculate bounds for exit animations (where element was in prev transform)
  exitBounds(node, transform) {
    if (!node) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: (node.x0 - transform.x) * transform.kx,
      y: (node.y0 - transform.y) * transform.ky,
      w: (node.x1 - node.x0) * transform.kx,
      h: (node.y1 - node.y0) * transform.ky
    };
  },

  // Reset zoom state (for view changes)
  reset() {
    this._prev = { x: 0, y: 0, kx: 1, ky: 1 };
    this._curr = { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Set clicked bounds for zoom-in animation (call before navigation)
  setClickedBounds(bounds) {
    this._clickedBounds = bounds;
  },

  // Get and clear clicked bounds for zoom-in animation
  consumeClickedBounds() {
    const bounds = this._clickedBounds;
    this._clickedBounds = null;
    return bounds;
  },

  // Track entry bounds for partial view (used for zoom-out animation)
  _partialEntryBounds: null,
  setPartialEntryBounds(bounds) {
    this._partialEntryBounds = bounds;
  },
  consumePartialEntryBounds() {
    const bounds = this._partialEntryBounds;
    this._partialEntryBounds = null;
    return bounds;
  },

  // Prepare SVG for animation by interrupting existing transitions and removing stale layers
  // Returns true if ready to animate, false if oldLayer is empty
  prepareAnimation(svg, oldLayer, staleSelector) {
    // Interrupt and remove stale layers
    if (staleSelector) {
      svg.selectAll(staleSelector).interrupt().remove();
    }
    // Interrupt old layer if it exists
    if (oldLayer && !oldLayer.empty()) {
      oldLayer.interrupt();
      return true;
    }
    return false;
  },

  // Generalized two-layer crossfade animation
  // Works for any transition: folder→folder, file→function, etc.
  // direction: 'in' (zoom into clicked element) or 'out' (zoom back to parent)
  animateLayers(oldLayer, newLayer, bounds, width, height, t, direction) {
    if (!bounds || !oldLayer || !newLayer || oldLayer.empty() || newLayer.empty()) return false;

    // Use non-uniform scaling so both dimensions animate (avoids no-zoom when one dimension matches)
    const scaleX = width / bounds.w;
    const scaleY = height / bounds.h;
    const invScaleX = bounds.w / width;
    const invScaleY = bounds.h / height;

    // Hide text on old layer
    oldLayer.selectAll('text').style('opacity', 0);
    oldLayer.attr('pointer-events', 'none');

    // Counter-scale text on new layer to maintain constant size during animation
    // Text counter-scale must be INVERSE of layer scale (not linear interpolation)
    // Layer interpolates: startLayerScale → 1, so text needs: 1/layerScale at each frame
    const startLayerScaleX = direction === 'in' ? invScaleX : scaleX;
    const startLayerScaleY = direction === 'in' ? invScaleY : scaleY;

    // Set initial counter-scale
    const initCounterX = 1 / startLayerScaleX;
    const initCounterY = 1 / startLayerScaleY;
    newLayer.selectAll('text').each(function() {
      const text = d3.select(this);
      const x = parseFloat(text.attr('x')) || 0;
      const y = parseFloat(text.attr('y')) || 0;
      text.attr('transform', 'translate(' + x + ',' + y + ') scale(' + initCounterX + ',' + initCounterY + ') translate(' + (-x) + ',' + (-y) + ')');
    });

    // Animate counter-scale as inverse of layer scale
    newLayer.selectAll('text')
      .transition(t)
      .attrTween('transform', function() {
        const text = d3.select(this);
        const x = parseFloat(text.attr('x')) || 0;
        const y = parseFloat(text.attr('y')) || 0;
        return function(progress) {
          // Layer scale at this progress: lerp(startLayerScale, 1, progress)
          const layerSx = startLayerScaleX + (1 - startLayerScaleX) * progress;
          const layerSy = startLayerScaleY + (1 - startLayerScaleY) * progress;
          // Counter-scale is inverse of layer scale
          const sx = 1 / layerSx;
          const sy = 1 / layerSy;
          if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return '';
          return 'translate(' + x + ',' + y + ') scale(' + sx + ',' + sy + ') translate(' + (-x) + ',' + (-y) + ')';
        };
      });

    if (direction === 'in') {
      // ZOOM IN: Old scales up toward bounds, new expands from bounds

      // Old layer: scale up so bounds fills screen
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start small at bounds position, expand to fill
      newLayer
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)')
        .style('opacity', 1);

    } else {
      // ZOOM OUT: Old shrinks to bounds, new scales down from enlarged state
      // Use top-left alignment: old view showed content at (0,0), so bounds should start there

      // Old layer: shrink so content at (0,0) ends up at bounds position
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start with bounds filling screen, animate to identity
      newLayer
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)');
    }
    return true;
  },

  // Getters for current state
  get prev() { return this._prev; },
  get curr() { return this._curr; },
  get clickedBounds() { return this._clickedBounds; },
  get duration() { return ZOOM_DURATION; }
};
`;
