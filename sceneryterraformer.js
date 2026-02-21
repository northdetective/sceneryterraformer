registerPlugin({
    name: 'Scenery Terraformer',
    version: '2.5',
    authors: ['Gemini'],
    type: 'local',
    licence: 'MIT',
    targetApiVersion: 70,
    main: function() {
        var selectedObjectId = 0;
        var deleteObjects = false;

        var heightDelta = 0;
        var flattenTerrain = true;

        var applyTerrainStyle = false;
        var selectedSurfaceStyle = 0;
        var selectedEdgeStyle = 0;

        var window = null;

        function updateUI() {
            if (window) {
                window.findWidget('id-spinner').text = selectedObjectId.toString();
                window.findWidget('height-spinner').text = heightDelta.toString();
                window.findWidget('surface-spinner').text = selectedSurfaceStyle.toString();
                window.findWidget('edge-spinner').text = selectedEdgeStyle.toString();

                window.findWidget('delete-checkbox').isChecked = deleteObjects;
                window.findWidget('flatten-checkbox').isChecked = flattenTerrain;
                window.findWidget('apply-style-checkbox').isChecked = applyTerrainStyle;
            }
        }

        function pickScenery() {
            ui.activateTool({
                id: 'scenery-picker',
                cursor: 'picker',
                onDown: function(e) {
                    if (!e.mapCoords) return;
                    var tile = map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32));
                    for (var i = 0; i < tile.numElements; i++) {
                        var el = tile.getElement(i);
                        if (el.type === 'small_scenery' || el.type === 'large_scenery') {
                            selectedObjectId = el.object;
                            updateUI();
                            ui.tool.cancel();
                            return;
                        }
                    }
                    ui.showError("Selection Failed", "No scenery found on this tile.");
                }
            });
        }

        function pickTerrain() {
            ui.activateTool({
                id: 'terrain-picker',
                cursor: 'picker',
                onDown: function(e) {
                    if (!e.mapCoords) return;
                    var tile = map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32));
                    for (var i = 0; i < tile.numElements; i++) {
                        var el = tile.getElement(i);
                        if (el.type === 'surface') {
                            selectedSurfaceStyle = el.surfaceStyle;
                            selectedEdgeStyle = el.edgeStyle;
                            applyTerrainStyle = true;
                            updateUI();
                            ui.tool.cancel();
                            return;
                        }
                    }
                }
            });
        }

        function executeTerraform() {
            var modifiedCount = 0;
            var deletedCount = 0;

            for (var y = 0; y < map.size.y; y++) {
                for (var x = 0; x < map.size.x; x++) {
                    var tile = map.getTile(x, y);
                    var hasTargetScenery = false;

                    // Check for target scenery and optionally delete it
                    for (var i = tile.numElements - 1; i >= 0; i--) {
                        var el = tile.getElement(i);
                        if ((el.type === 'small_scenery' || el.type === 'large_scenery') && el.object === selectedObjectId) {
                            hasTargetScenery = true;
                            if (deleteObjects) {
                                tile.removeElement(i);
                                deletedCount++;
                            }
                        }
                    }

                    if (!hasTargetScenery) continue; // skip this tile

                    // Find surface element
                    var surface = null;
                    for (var i = 0; i < tile.numElements; i++) {
                        if (tile.getElement(i).type === 'surface') {
                            surface = tile.getElement(i);
                            break;
                        }
                    }
                    if (!surface) continue; // skip if no surface

                    // Flatten terrain
                    if (flattenTerrain) surface.slope = 0;

                    // Adjust baseHeight for heightDelta
                    surface.baseHeight = Math.floor(surface.baseHeight + (heightDelta * 2));

                    // Apply terrain style
                    if (applyTerrainStyle) {
                        surface.surfaceStyle = selectedSurfaceStyle;
                        surface.edgeStyle = selectedEdgeStyle;
                    }

                    modifiedCount++;
                }
            }

            var msg = "Modified " + modifiedCount + " tiles.";
            if (deleteObjects) msg += " Deleted " + deletedCount + " objects.";
            ui.showError("Complete", msg);
        }

        ui.registerMenuItem('Scenery Terraformer', function() {
            window = ui.openWindow({
                classification: 'scenery_terraformer',
                title: 'Scenery Terraformer',
                width: 250, height: 300,
                widgets: [
                    { type: 'label', x: 10, y: 20, width: 230, height: 14, text: '1. Target Scenery:' },
                    { type: 'button', x: 10, y: 35, width: 90, height: 20, text: 'Eyedropper', onClick: pickScenery },
                    { type: 'spinner', name: 'id-spinner', x: 110, y: 35, width: 100, height: 20, text: selectedObjectId.toString(),
                        onDecrement: function() { if (selectedObjectId > 0) selectedObjectId--; updateUI(); },
                        onIncrement: function() { selectedObjectId++; updateUI(); }
                    },
                    { type: 'checkbox', name: 'delete-checkbox', x: 10, y: 60, width: 230, height: 15, text: 'Delete Target Objects on Execution', isChecked: deleteObjects,
                        onChange: function(isChecked) { deleteObjects = isChecked; }
                    },

                    { type: 'label', x: 10, y: 85, width: 150, height: 14, text: '2. Terrain Shape:' },
                    { type: 'label', x: 10, y: 102, width: 100, height: 14, text: 'Height Change:' },
                    { type: 'spinner', name: 'height-spinner', x: 110, y: 100, width: 100, height: 20, text: heightDelta.toString(),
                        onDecrement: function() { heightDelta--; updateUI(); },
                        onIncrement: function() { heightDelta++; updateUI(); }
                    },
                    { type: 'checkbox', name: 'flatten-checkbox', x: 10, y: 125, width: 230, height: 15, text: 'Flatten Terrain', isChecked: flattenTerrain,
                        onChange: function(isChecked) { flattenTerrain = isChecked; }
                    },

                    { type: 'label', x: 10, y: 150, width: 230, height: 14, text: '3. Terrain Styling (Optional):' },
                    { type: 'checkbox', name: 'apply-style-checkbox', x: 10, y: 165, width: 230, height: 15, text: 'Apply New Terrain Style', isChecked: applyTerrainStyle,
                        onChange: function(isChecked) { applyTerrainStyle = isChecked; }
                    },
                    { type: 'button', x: 10, y: 185, width: 90, height: 20, text: 'Terrain Picker', onClick: pickTerrain },
                    { type: 'label', x: 10, y: 212, width: 100, height: 14, text: 'Surface Style ID:' },
                    { type: 'spinner', name: 'surface-spinner', x: 110, y: 210, width: 100, height: 20, text: selectedSurfaceStyle.toString(),
                        onDecrement: function() { if (selectedSurfaceStyle > 0) selectedSurfaceStyle--; updateUI(); },
                        onIncrement: function() { selectedSurfaceStyle++; updateUI(); }
                    },
                    { type: 'label', x: 10, y: 237, width: 100, height: 14, text: 'Edge Style ID:' },
                    { type: 'spinner', name: 'edge-spinner', x: 110, y: 235, width: 100, height: 20, text: selectedEdgeStyle.toString(),
                        onDecrement: function() { if (selectedEdgeStyle > 0) selectedEdgeStyle--; updateUI(); },
                        onIncrement: function() { selectedEdgeStyle++; updateUI(); }
                    },

                    { type: 'button', x: 10, y: 265, width: 230, height: 25, text: 'Execute Terraforming', onClick: executeTerraform }
                ],
                onClose: function() { window = null; }
            });
        });
    }
});