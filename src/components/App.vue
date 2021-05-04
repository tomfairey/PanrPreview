<template>
    <div id="app">
        <div class="app-scaffold">
            <div class="body-container">
                <div class="ui-container">
                    <label for="devOrienToggle" style="position: absolute; top: 8px; right: 30px; z-index: 6; color: #FFFFFF;">Device Orientation:</label>
                    <input id="devOrienToggle" type="checkbox" style="position: absolute; top: 10px; right: 10px; z-index: 6;" v-if="deviceOrientationSupported" v-model="deviceOrientationEnabled" />
                </div>
                <div class="content-container">
                    <div ref="three"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import * as THREE from 'three';
    import Stats from 'three/examples/jsm/libs/stats.module.js';
    import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
    import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

    export default {
        name: "PanrApp",
        components: {
            
        },
        data() {
            return {
                "splashVisible": true,
                "startVisible": true,
                three: null,
                lon: 0,
                lat: 0,
                phi: 0,
                theta: 0,
                onPointerDownMouseX: 0,
                onPointerDownMouseY: 0,
                deviceOrientationSupported: false,
                deviceOrientationEnabled: false
            }
        },
        methods: {
            toggleSplash: function (bool = !this.splashVisible) {
                this.splashVisible = bool;
            },
            toggleStart: function (bool = !this.startVisible) {
                this.startVisible = bool;

                document.documentElement.requestFullscreen();
            },
            loadScene: function(imageURL) {
                const geometry = new THREE.SphereGeometry(500, 60, 40);
				// invert the geometry on the x-axis so that all of the faces point inward
				geometry.scale(-1, 1, 1);

				const texture = new THREE.TextureLoader().load(imageURL);
				const material = new THREE.MeshBasicMaterial({ map: texture });

                const mesh = new THREE.Mesh(geometry, material);

                while(this.three.scene.children.length > 0){ 
                    this.three.scene.remove(this.three.scene.children[0]); 
                }

                this.three.scene.add(mesh);
            },
            update: function() {
                this.lat = Math.max(-85, Math.min(85, this.lat));
                this.phi = THREE.MathUtils.degToRad(90 - this.lat);
                this.theta = THREE.MathUtils.degToRad(this.lon);

                const x = 500 * Math.sin(this.phi) * Math.cos(this.theta);
                const y = 500 * Math.cos(this.phi);
                const z = 500 * Math.sin(this.phi) * Math.sin(this.theta);

                this.three.camera.lookAt(x, y, z);
            },
            animate: function() {
                // requestAnimationFrame(this.animate);
                if(this.deviceOrientationEnabled) {
                    this.three.controls.update();
                } else {
                    this.update();
                }

                this.three.renderer.render(this.three.scene, this.three.camera);

                this.three.stats.update();
            },
            onPointerDown: function(event) {
                if (this.deviceOrientationEnabled || event.isPrimary === false) return;

				this.onPointerDownMouseX = event.clientX;
				this.onPointerDownMouseY = event.clientY;

				this.onPointerDownLon = this.lon;
				this.onPointerDownLat = this.lat;

				document.addEventListener('pointermove', this.onPointerMove);
				document.addEventListener('pointerup', this.onPointerUp);
            },
            onPointerMove: function(event) {
                if (this.deviceOrientationEnabled || event.isPrimary === false) return;

				this.lon = (this.onPointerDownMouseX - event.clientX) * 0.1 + this.onPointerDownLon;
				this.lat = (event.clientY - this.onPointerDownMouseY) * 0.1 + this.onPointerDownLat;
            },
            onPointerUp: function(event) {
                if (this.deviceOrientationEnabled || event.isPrimary === false) return;

				document.removeEventListener('pointermove', this.onPointerMove);
				document.removeEventListener('pointerup', this.onPointerUp);
            },
            onWindowResize: function() {
				this.three.camera.aspect = window.innerWidth / window.innerHeight;
				this.three.camera.updateProjectionMatrix();

				this.three.renderer.setSize(window.innerWidth, window.innerHeight);
			},
            onDocumentMouseDown: function(event) {
                // event.preventDefault();

                this.three.mouse.x = (event.clientX / this.three.renderer.domElement.clientWidth) * 2 - 1;
                this.three.mouse.y = -(event.clientY / this.three.renderer.domElement.clientHeight) * 2 + 1;

                this.three.raycaster.setFromCamera(this.three.mouse, this.three.camera);

                let intersects = this.three.raycaster.intersectObjects(this.three.scene.children);

                if(intersects.length > 1) {
                    if(intersects[0].object.callback) intersects[0].object.callback();
                } else if(intersects.length == 1) {
                    const geometry2 = new THREE.CircleGeometry(40, 80);
                    const material2 = new THREE.MeshBasicMaterial({ color: 0x00FFFF, side: THREE.DoubleSide, transparent: true, opacity: 0.75, depthTest: false });
                    const circle = new THREE.Mesh(geometry2, material2);

                    circle.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
                    // circle.rotation.y = hotspot.rotation[0];
                    circle.rotation.y = Math.atan2( ( this.three.camera.position.x - circle.position.x ), ( this.three.camera.position.z - circle.position.z ) );
                    this.three.scene.add(circle);

                    console.log({
                        position: {
                            x: circle.position.x,
                            y: circle.position.y,
                            z: circle.position.z
                        },
                        rotation: {
                            x: circle.rotation.x,
                            y: circle.rotation.y,
                            z: circle.rotation.z
                        },
                    });

                    circle.callback = () => {
                        circle.visible = false;
                        this.three.scene.remove(circle);
                    }
                }
            },
            handleFiles(files) {
                if(files.length > 1) throw new Error("Only one file is accepted");

                console.log({files});

                this.loadScene(URL.createObjectURL(files[0]));
            }
        },
        mounted() {
            this.three = {
                camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100),
                scene: new THREE.Scene(),
                renderer: new THREE.WebGLRenderer(),
                controls: null,
                stats: new Stats(),
                raycaster: new THREE.Raycaster(),
                mouse: new THREE.Vector2()
            };

            window.addEventListener('click', this.onDocumentMouseDown, false);

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                window.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                window.addEventListener(eventName, () => { window.classList.add('highlight') }, false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                window.addEventListener(eventName, () => { window.classList.remove('highlight') }, false)
            })

            window.addEventListener('drop', (e) => {
                let dt = e.dataTransfer;
                let files = dt.files;

                this.handleFiles(files);
            }, false);

            let arrow = new THREE.ArrowHelper(this.three.raycaster.ray.direction, this.three.raycaster.ray.origin, 100, Math.random() * 0xffffff );
            this.three.scene.add(arrow);
 
            arrow.setDirection(this.three.raycaster.ray.direction);
 
            // update the raycaster
            this.three.raycaster.set(this.three.camera.getWorldPosition(), this.three.camera.getWorldDirection());

            if (window.DeviceOrientationEvent) {
                this.three.controls = new DeviceOrientationControls(this.three.camera);

                this.deviceOrientationSupported = true;
            }

            let three = this.$refs['three'];

            this.three.renderer.setPixelRatio(window.devicePixelRatio);
            this.three.renderer.setSize(window.innerWidth, window.innerHeight);

            three.appendChild(this.three.renderer.domElement);
            three.appendChild(this.three.stats.dom);

            if('xr' in navigator) {
                navigator.xr.isSessionSupported('immersive-vr').then(supported => {
                    if(!supported) return;

                    three.appendChild(VRButton.createButton(this.three.renderer));
                    this.three.renderer.xr.enabled = true;

                    document.addEventListener('touch', this.onDocumentMouseDown, false);
                });
            }

            this.three.renderer.setAnimationLoop(this.animate);

            three.addEventListener('pointerdown', this.onPointerDown);
            three.style.touchAction = 'none';

            // this.loadScene(this.initialLocation);

            this.animate();

            window.addEventListener('resize', this.onWindowResize);

            new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 1500);
            }).then(() => {
                this.toggleSplash(false);
            });
        }
    }
</script>

<style>
    html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
    .slick-slider {
        display: flex;
        position: relative;
        flex-direction: column-reverse;
        width: 100%;
        height: 100%;
    }
    .slick-slider > div.slick-list {
        height: 100%;
    }
    .slick-slider > div.slick-list > div.slick-track {
        display: flex;
        position: relative;
        width: 100%;
        height: 100%;
    }
    .slick-slider > div.slick-list > div.slick-track > div.slick-slide {
        display: flex;
        position: relative;
        overflow: auto;
    }
    .slick-slider > div.slick-list > div.slick-track > div.slick-slide > div {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
    }
    .slick-slider > div.slick-list > div.slick-track > div.slick-slide > div > *{
        outline: none;
    }
</style>

<style scoped>
    #app {
        display: flex;
        position: absolute;
        width: 100%;
        height: 100%;
    }

    .app-scaffold {
        display: flex;
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }
    .app-scaffold .overlay-container {
        display: flex;
        position: absolute;

        z-index: 4;
        pointer-events: none;

        width: 100%;
        height: 100%;
        overflow: hidden;
    }
    .app-scaffold .body-container {
        display: flex;
        position: absolute;

        z-index: 2;

        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .content-container {
        display: flex;
        position: absolute;
        width: 100vw;
        height: 100vh;
        /* background-color: #000000; */
    }
</style>