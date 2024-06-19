import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders'; // Import loaders if you need to load models other than .babylon
import * as GUI from 'babylonjs-gui';

// Get the canvas element from the DOM
const canvas = document.getElementById('renderCanvas');

if (canvas) {
    // Generate the Babylon.js 3D engine
    const engine = new BABYLON.Engine(canvas, true);

    const createScene = () => {
        // Create a basic BJS Scene object
        const scene = new BABYLON.Scene(engine);

        // Set the background color of the scene
        scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.05, 1); // Dark grey background

        // Create an ArcRotateCamera (orbital camera)
        const camera = new BABYLON.ArcRotateCamera('camera1', BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(45), 8, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true);
        camera.panningSensibility = 0; // Disable pan movement

        // Load and apply HDRI
        const hdrTexture = new BABYLON.HDRCubeTexture("./environment.hdr", scene, 128);
        scene.environmentTexture = hdrTexture;

        // Create a basic light, aiming 0,1,0 - meaning, to the sky
        const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);

        let currentMaterial;
        let metallicMaterial;
        let wireframeMaterial;
        let meshes = [];

        const addHotspot = (scene, position, color) => {
            const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
            const hotspot = new GUI.Ellipse('hotspot'); // Use Ellipse for circular shape
            hotspot.width = '20px';
            hotspot.height = '20px';
            hotspot.color = '#00ff00';
            hotspot.thickness = 4;
            hotspot.background = color; // Set the background color
            advancedTexture.addControl(hotspot);

            // Add CSS animations
            const fadeInAnimation = new BABYLON.Animation(
                'fadeIn',
                'alpha',
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const fadeOutAnimation = new BABYLON.Animation(
                'fadeOut',
                'alpha',
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            fadeInAnimation.setKeys([
                { frame: 0, value: 0 },
                { frame: 2, value: 1 }
            ]);

            fadeOutAnimation.setKeys([
                { frame: 0, value: 1 },
                { frame: 2, value: 0 }
            ]);

            let isOccluded = false;

            scene.registerBeforeRender(() => {
                const projectedPosition = BABYLON.Vector3.Project(
                    position,
                    BABYLON.Matrix.Identity(),
                    scene.getTransformMatrix(),
                    camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
                );

                if (currentMaterial === metallicMaterial) {
                    if (isMeshOccluded(position, camera, scene)) {
                        if (!isOccluded) {
                            scene.beginDirectAnimation(hotspot, [fadeOutAnimation], 0, 30, false);
                            isOccluded = true;
                        }
                    } else {
                        if (isOccluded) {
                            scene.beginDirectAnimation(hotspot, [fadeInAnimation], 0, 30, false);
                            isOccluded = false;
                        }
                        hotspot.left = projectedPosition.x - engine.getRenderWidth() / 2;
                        hotspot.top = projectedPosition.y - engine.getRenderHeight() / 2;
                    }
                } else {
                    if (isOccluded) {
                        scene.beginDirectAnimation(hotspot, [fadeInAnimation], 0, 30, false);
                        isOccluded = false;
                    }
                    hotspot.left = projectedPosition.x - engine.getRenderWidth() / 2;
                    hotspot.top = projectedPosition.y - engine.getRenderHeight() / 2;
                }
            });
        };

        // Load a mesh and add a hotspot at the center with a specified color
        BABYLON.SceneLoader.ImportMesh('', '/mesh.glb', '', scene, function (loadedMeshes) {
            meshes = loadedMeshes;
            meshes.forEach(mesh => {
                mesh.position.y = 0; // Adjust position as needed
            });

            // Create a metallic physical material
            metallicMaterial = new BABYLON.PBRMetallicRoughnessMaterial('metallicMaterial', scene);
            metallicMaterial.metallic = 1.0;
            metallicMaterial.roughness = 0.1;
            metallicMaterial.baseColor = new BABYLON.Color3(0.7, 0.9, 0.7);

            // Create a wireframe material
            wireframeMaterial = new BABYLON.StandardMaterial('wireframeMaterial', scene);
            wireframeMaterial.wireframe = true;
            wireframeMaterial.emissiveColor = new BABYLON.Color3.FromHexString("#00cc44");
            wireframeMaterial.disableLighting = true;

            // Set initial material
            currentMaterial = metallicMaterial;
            meshes.forEach(mesh => {
                mesh.material = currentMaterial;
            });

            // Add a hotspot at the center of the mesh with a specified color
            addHotspot(scene, new BABYLON.Vector3(0, 0, 0), 'green'); // Change 'green' to any color you want
        });

        // Create a button to switch materials
        const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
        const button = GUI.Button.CreateSimpleButton('switchButton', 'X-Ray');
        button.width = '150px';
        button.height = '40px';
        button.color = '#00ff00';
        button.background = 'black';
        button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        button.top = "-10%";
        button.onPointerUpObservable.add(() => {
            if (meshes.length > 0) {
                if (currentMaterial === metallicMaterial) {
                    currentMaterial = wireframeMaterial;
                } else {
                    currentMaterial = metallicMaterial;
                }
                meshes.forEach(mesh => {
                    mesh.material = currentMaterial;
                });
            }
        });

        advancedTexture.addControl(button);

        return scene;
    };

    const isMeshOccluded = (position, camera, scene) => {
        const ray = new BABYLON.Ray(camera.position, position.subtract(camera.position));
        const hit = scene.pickWithRay(ray);
        return hit.hit && hit.pickedMesh !== null;
    };

    // Call the createScene function
    const scene = createScene();

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener('resize', () => {
        engine.resize();
    });
}
