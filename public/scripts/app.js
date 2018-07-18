require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/VectorTileLayer",
    "esri/Basemap",
    "esri/layers/Layer",
    "esri/WebMap",
    "esri/Graphic",
    "esri/widgets/Expand",
    "esri/core/watchUtils",
    "dojo/on",
    "dojo/dom",
    "dojo/domReady!"
], function (Map, MapView, VectorTileLayer, Basemap, Layer, WebMap, Graphic, Expand,
    watchUtils,
    on, dom) {

    let featureLayer, editExpand;

    // feature edit area domNodes
    let editArea, editFeature, attributeEditing, updateInstructionDiv;

    // const simpleRenderer = {
    //     type: "simple",  // autocasts as new SimpleRenderer()
    //     symbol: {
    //         type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
    //         size: 12,
    //         color: "red",
    //         outline: {  // autocasts as new SimpleLineSymbol()
    //             width: 0.5,
    //             color: "white"
    //         }
    //     }
    // };

    const vtlItem = new VectorTileLayer({
        url: "http://www.arcgis.com/sharing/rest/content/items/2557730096db4d2fa3e64980d431c29e/resources/styles/root.json?f=pjson"
    });

    const vectorBasemap = new Basemap({
        baseLayers: [vtlItem],
        title: "Custom Basemap",
        id: "myBasemap"
    });
    
    const mapEditing = new Map({
        basemap: vectorBasemap
    });

    const mapHeatmap = new WebMap({
        portalItem: {
            id: "22ef9d1f8d9e49e6920f0c4e0643113a"
        }
    });

    const viewEditing = new MapView({
        container: "mapEditing",  
        map: mapEditing,  
        zoom: 3,  
        center: [17, 50]  
    });

    const viewHeatmap = new MapView({
        container: "mapHeatmap",
        map: mapHeatmap,
        zoom: 3,
        center: [17, 50]  
    });

    // add an editable featurelayer from portal
    Layer.fromPortalItem({
        portalItem: { // autocasts as new PortalItem()
            id: "30ae9d12f10e407a8c1b2df7c72b7d46"
        }
    }).then(addLayer)
            .catch(handleLayerLoadError);

    setupEditing();
    setupView();

    function addLayer(layer) {
        featureLayer = layer;
        mapEditing.add(layer);
    }

    function applyEdits(params) {
        unselectFeature();
        let promise = featureLayer.applyEdits(params);
        editResultsHandler(promise);
    }

    // *****************************************************
    // applyEdits promise resolved successfully
    // query the newly created feature from the featurelayer
    // set the editFeature object so that it can be used
    // to update its features.
    // *****************************************************
    function editResultsHandler(promise) {
        promise
            .then(function (editsResult) {
                let extractObjectId = function (result) {
                    return result.objectId;
                };

                // get the objectId of the newly added feature
                if (editsResult.addFeatureResults.length > 0) {
                    let adds = editsResult.addFeatureResults.map(
                        extractObjectId);
                    let newIncidentId = adds[0];

                    selectFeature(newIncidentId);
                }
            })
            .catch(function (error) {
                console.log("===============================================");
                console.error("[ applyEdits ] FAILURE: ", error.code, error.name,
                    error.message);
                console.log("error = ", error);
            });
    }

    // *****************************************************
    // listen to click event on the view
    // 1. select if there is an intersecting feature
    // 2. set the instance of editFeature
    // 3. editFeature is the feature to update or delete
    // *****************************************************
    viewEditing.on("click", function (event) {
        unselectFeature();
        viewEditing.hitTest(event).then(function (response) {
            
            if (response.results.length > 1 && response.results[0].graphic) {
                let feature = response.results[0].graphic;
                selectFeature(feature.attributes[featureLayer.objectIdField]);

                
                attributeEditing.style.display = "block";
                updateInstructionDiv.style.display = "none";
            }
        });
    });

    // *****************************************************
    // select Feature function
    // 1. Select the newly created feature on the view
    // 2. or select an existing feature when user click on it
    // 3. Symbolize the feature with cyan rectangle
    // *****************************************************
    function selectFeature(objectId) {
        // symbol for the selected feature on the view
        let selectionSymbol = {
            type: "simple-marker", // autocasts as new SimpleMarkerSymbol()
            color: [0, 0, 0, 0],
            style: "square",
            size: "40px",
            outline: {
                color: [0, 255, 255, 1],
                width: "3px"
            }
        };
        let query = featureLayer.createQuery();
        query.where = featureLayer.objectIdField + " = " + objectId;

        featureLayer.queryFeatures(query).then(function (results) {
            if (results.features.length > 0) {
                editFeature = results.features[0];
                editFeature.symbol = selectionSymbol;
                viewEditing.graphics.add(editFeature);
            }
        });
    }

    // *****************************************************
    // hide attributes update and delete part when necessary
    // *****************************************************
    function unselectFeature() {
        attributeEditing.style.display = "none";
        updateInstructionDiv.style.display = "block";

        
        viewEditing.graphics.removeAll();
    }

    // *****************************************************
    // add homeButton and expand widgets to UI
    // *****************************************************
    function setupView() {
        // expand widget
        editExpand = new Expand({
            expandIconClass: "esri-icon-edit",
            expandTooltip: "Expand Edit",
            expanded: true,
            view: viewEditing,
            content: editArea
        });
        viewEditing.ui.add(editExpand, "top-right");
    }

    // *****************************************************
    // set up for editing
    // *****************************************************
    function setupEditing() {
        // input boxes for the attribute editing
        editArea = dom.byId("editArea");
        updateInstructionDiv = dom.byId("updateInstructionDiv");
        attributeEditing = dom.byId("featureUpdateDiv");
        

        

        // *****************************************************
        // btnAddFeature click event
        // create a new feature at the click location
        // *****************************************************
        on(dom.byId("btnAddFeature"), "click", function () {
            unselectFeature();
            on.once(viewEditing, "click", function (event) {
                event.stopPropagation();

                if (event.mapPoint) {
                    let point = event.mapPoint.clone();
                    point.z = undefined;
                    point.hasZ = false;

                    let newIncident = new Graphic({
                        geometry: point,
                        attributes: {}
                    });
                    
                    let edits = {
                        addFeatures: [newIncident]
                    };

                    applyEdits(edits);
                    
                    // ui changes in response to creating a new feature
                    // display feature update and delete portion of the edit area
                    attributeEditing.style.display = "block";
                    updateInstructionDiv.style.display = "none";
                    dom.byId("mapEditing").style.cursor = "auto";
                } else {
                    console.error("event.mapPoint is not defined");
                }
            });

            // change the view's mouse cursor once user selects
            // a new incident type to create
            dom.byId("mapEditing").style.cursor = "crosshair";
            editArea.style.cursor = "auto";
        });

        // *****************************************************
        // delete button click event. ApplyEdits is called
        // with the selected feature to be deleted
        // *****************************************************
        on(dom.byId("btnDelete"), "click", function () {
            let edits = {
                deleteFeatures: [editFeature]
            };
            applyEdits(edits);
        });
    };

    function handleLayerLoadError(error) {
        console.log("Layer failed to load: ", error);
    };

    /**
       * utility method that synchronizes the viewpoint of a view to other views
       */
    var synchronizeView = function (view, others) {
        others = Array.isArray(others) ? others : [others];

        var viewpointWatchHandle;
        var viewStationaryHandle;
        var otherInteractHandlers;
        var scheduleId;

        var clear = function () {
            if (otherInteractHandlers) {
                otherInteractHandlers.forEach(function (handle) {
                    handle.remove();
                });
            }
            viewpointWatchHandle && viewpointWatchHandle.remove();
            viewStationaryHandle && viewStationaryHandle.remove();
            scheduleId && clearTimeout(scheduleId);
            otherInteractHandlers = viewpointWatchHandle =
                viewStationaryHandle = scheduleId = null;
        };

        var interactWatcher = view.watch('interacting,animation',
            function (newValue) {
                if (!newValue) {
                    return;
                }
                if (viewpointWatchHandle || scheduleId) {
                    return;
                }

                // start updating the other views at the next frame
                scheduleId = setTimeout(function () {
                    scheduleId = null;
                    viewpointWatchHandle = view.watch('viewpoint',
                        function (newValue) {
                            others.forEach(function (otherView) {
                                otherView.viewpoint = newValue;
                            });
                        });
                }, 0);

                // stop as soon as another view starts interacting, like if the user starts panning
                otherInteractHandlers = others.map(function (otherView) {
                    return watchUtils.watch(otherView,
                        'interacting,animation',
                        function (
                            value) {
                            if (value) {
                                clear();
                            }
                        });
                });

                // or stop when the view is stationary again
                viewStationaryHandle = watchUtils.whenTrue(view,
                    'stationary', clear);
            });

        return {
            remove: function () {
                this.remove = function () { };
                clear();
                interactWatcher.remove();
            }
        }
    };

    /**
     * utility method that synchronizes the viewpoints of multiple views
     */
    var synchronizeViews = function (views) {
        var handles = views.map(function (view, idx, views) {
            var others = views.concat();
            others.splice(idx, 1);
            return synchronizeView(view, others);
        });

        return {
            remove: function () {
                this.remove = function () { };
                handles.forEach(function (h) {
                    h.remove();
                });
                handles = null;
            }
        }
    }

    // bind the views
    synchronizeViews([viewEditing, viewHeatmap]);
    
});