const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
);

camera.position.z = 1400;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    window.devicePixelRatio
);

document.body.appendChild(renderer.domElement);


const SPHERE_RADIUS = 700;
const PHOTO_SIZE = 120;
const AUTO_ROTATION_SPEED = 0.0015;

const sphereGroup = new THREE.Group();
scene.add(sphereGroup);

const loader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let loaded = 0;
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationSpeed = AUTO_ROTATION_SPEED;
let selectedPhoto = null;
let photos = [];


function getPhotoExtension(index) {
    return index === 1 ? 'jpg' : 'png';
}


const photoCount = 37;

for (let i = 0; i < photoCount; i++) {
    const ext = getPhotoExtension(i + 1);
    loader.load(
        `photos/${i + 1}.${ext}`,
        texture => {
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true
            });

            const sprite = new THREE.Sprite(material);

            sprite.scale.set(PHOTO_SIZE, PHOTO_SIZE, 1);

            const phi = Math.acos(1 - 2 * (i + 0.5) / photoCount);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
            const y = SPHERE_RADIUS * Math.cos(phi);
            const z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

            sprite.position.set(x, y, z);
            sprite.lookAt(camera.position);

            sprite.userData = {
                originalPosition: new THREE.Vector3(x, y, z),
                originalScale: new THREE.Vector3(PHOTO_SIZE, PHOTO_SIZE, 1),
                index: i + 1
            };

            sphereGroup.add(sprite);
            photos.push(sprite);

            loaded++;
            updateLoading();
        },
        xhr => {
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
            }
        },
        error => {
            console.error(`Failed to load photo ${i + 1}`);
            loaded++;
            updateLoading();
        }
    );
}


function updateLoading() {
    const progress = (loaded / photoCount) * 100;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
    }

    if (loaded >= photoCount) {
        setTimeout(() => {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 500);
            }
        }, 300);
    }
}


function createPhotoFrame(sprite) {
    const geometry = new THREE.PlaneGeometry(PHOTO_SIZE + 8, PHOTO_SIZE + 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(geometry, material);
    frame.position.copy(sprite.position);
    frame.lookAt(camera.position);
    frame.userData = { isFrame: true };
    sphereGroup.add(frame);
    return frame;
}


window.addEventListener('mousedown', e => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
    rotationSpeed = 0;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photos);

    if (intersects.length > 0) {
        handlePhotoClick(intersects[0].object);
    }
});


window.addEventListener('mouseup', () => {
    isDragging = false;
    rotationSpeed = AUTO_ROTATION_SPEED;
});


window.addEventListener('mousemove', e => {
    if (!isDragging) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(photos);

        photos.forEach(photo => {
            photo.material.opacity = 1;
        });

        if (intersects.length > 0) {
            intersects[0].object.material.opacity = 0.8;
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'grab';
        }
        return;
    }

    const dx = e.clientX - previousMouseX;
    const dy = e.clientY - previousMouseY;

    sphereGroup.rotation.y += dx * 0.005;
    sphereGroup.rotation.x += dy * 0.005;

    sphereGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, sphereGroup.rotation.x));

    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
});


window.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.3;
    camera.position.z += e.deltaY * zoomSpeed;
    camera.position.z = Math.max(500, Math.min(3000, camera.position.z));
}, { passive: false });


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


function handlePhotoClick(sprite) {
    if (selectedPhoto === sprite) {
        resetPhoto(sprite);
        selectedPhoto = null;
    } else {
        if (selectedPhoto) {
            resetPhoto(selectedPhoto);
        }

        selectedPhoto = sprite;

        const targetScale = PHOTO_SIZE * 3;
        const targetPosition = sprite.userData.originalPosition.clone().multiplyScalar(0.5);

        sprite.scale.set(targetScale, targetScale, 1);
        sprite.position.copy(targetPosition);
        sprite.material.opacity = 1;

        photos.forEach(photo => {
            if (photo !== sprite) {
                photo.material.opacity = 0.3;
            }
        });
    }
}


function resetPhoto(sprite) {
    const originalPos = sprite.userData.originalPosition;
    const originalScale = sprite.userData.originalScale;

    sprite.position.copy(originalPos);
    sprite.scale.copy(originalScale);
    sprite.material.opacity = 1;

    photos.forEach(photo => {
        photo.material.opacity = 1;
    });
}


let touchStartX = 0;
let touchStartY = 0;
let touchStartDist = 0;

window.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        rotationSpeed = 0;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
}, { passive: false });


window.addEventListener('touchmove', e => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        sphereGroup.rotation.y += dx * 0.005;
        sphereGroup.rotation.x += dy * 0.005;
        sphereGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, sphereGroup.rotation.x));

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const deltaDist = currentDist - touchStartDist;

        camera.position.z -= deltaDist * 2;
        camera.position.z = Math.max(500, Math.min(3000, camera.position.z));

        touchStartDist = currentDist;
    }
}, { passive: false });


window.addEventListener('touchend', e => {
    isDragging = false;
    rotationSpeed = AUTO_ROTATION_SPEED;

    if (e.changedTouches.length === 1) {
        mouse.x = (e.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.changedTouches[0].clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(photos);

        if (intersects.length > 0) {
            handlePhotoClick(intersects[0].object);
        }
    }
});


function animate() {
    requestAnimationFrame(animate);

    sphereGroup.rotation.y += rotationSpeed;

    photos.forEach(photo => {
        photo.lookAt(camera.position);
    });

    renderer.render(scene, camera);
}

animate();
