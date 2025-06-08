import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import * as THREE from 'three';

const EggMascot = ({ 
  portfolioValue = 0, 
  userTenureDays = 0,
  isDoingCartwheel = false 
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const eggRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const frameRef = useRef(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState('baby');
  const [mood, setMood] = useState('happy');
  const [message, setMessage] = useState('');
  const [showParticles, setShowParticles] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isDancing, setIsDancing] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeFollow, setEyeFollow] = useState({ x: 0, y: 0 });
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  // Evolution stages based on portfolio value and tenure
  const getEvolutionStage = () => {
    const value = portfolioValue;
    const days = userTenureDays;
    
    if (value < 10000 && days < 30) return 'baby';
    if (value < 50000 && days < 90) return 'child';
    if (value < 100000 && days < 180) return 'teen';
    if (value < 500000 && days < 365) return 'adult';
    return 'wise';
  };

  useEffect(() => {
    setEvolutionStage(getEvolutionStage());
  }, [portfolioValue, userTenureDays]);

  // Character traits by evolution stage
  const stageTraits = {
    baby: {
      scale: 0.9,
      eggColor: '#D4A574',
      accentColor: '#B8885A',
      eyeSize: 0.22,
      pupilSize: 0.08,
      irisColor: '#4A90E2',
      bounceSpeed: 2,
      accessories: [],
      messages: ["Goo goo! 👶", "Me help grow! 🌱", "Nest egg tiny! 🥚", "Save save! 💰"],
      particleColor: '#FFD700',
      personality: 'playful',
      eyebrowThickness: 0.02,
      mouthWidth: 0.35
    },
    child: {
      scale: 0.95,
      eggColor: '#C19660',
      accentColor: '#A67C52',
      eyeSize: 0.21,
      pupilSize: 0.075,
      irisColor: '#52C41A',
      bounceSpeed: 2.5,
      accessories: ['cap'],
      messages: ["Growing strong! 💪", "Compound magic! ✨", "Let's save more! 🐷", "Portfolio power! 📈"],
      particleColor: '#FFA500',
      personality: 'energetic',
      eyebrowThickness: 0.025,
      mouthWidth: 0.4
    },
    teen: {
      scale: 1,
      eggColor: '#B8885A',
      accentColor: '#9B6F47',
      eyeSize: 0.2,
      pupilSize: 0.07,
      irisColor: '#722ED1',
      bounceSpeed: 3,
      accessories: ['glasses'],
      messages: ["Investing smart! 🧠", "Risk balanced! ⚖️", "Diversify! 🌍", "Future bright! 🌟"],
      particleColor: '#FF69B4',
      personality: 'confident',
      eyebrowThickness: 0.03,
      mouthWidth: 0.35
    },
    adult: {
      scale: 1.05,
      eggColor: '#A67C52',
      accentColor: '#8B6F47',
      eyeSize: 0.19,
      pupilSize: 0.065,
      irisColor: '#1890FF',
      bounceSpeed: 3.5,
      accessories: ['tie'],
      messages: ["Executive moves! 💼", "Strategic growth! 📊", "Wealth building! 🏗️", "Success! 🎯"],
      particleColor: '#4169E1',
      personality: 'sophisticated',
      eyebrowThickness: 0.035,
      mouthWidth: 0.3
    },
    wise: {
      scale: 1.1,
      eggColor: '#8B6F47',
      accentColor: '#6B5637',
      eyeSize: 0.18,
      pupilSize: 0.06,
      irisColor: '#52616B',
      bounceSpeed: 4,
      accessories: ['monocle', 'tophat'],
      messages: ["Sage wisdom! 🦉", "Legacy secured! 🏛️", "Master investor! 👑", "Enlightened! ✨"],
      particleColor: '#9370DB',
      personality: 'wise',
      eyebrowThickness: 0.04,
      mouthWidth: 0.25
    }
  };

  const currentTraits = stageTraits[evolutionStage];

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 3000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      40,
      1,
      0.1,
      1000
    );
    camera.position.set(0, 0.5, 3.5);
    camera.lookAt(0, -0.2, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(160, 200);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting setup for Pixar-style look
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 3, 3);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 10;
    mainLight.shadow.camera.left = -2;
    mainLight.shadow.camera.right = 2;
    mainLight.shadow.camera.top = 2;
    mainLight.shadow.camera.bottom = -2;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(-2, 1, -2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffd4a3, 0.2);
    fillLight.position.set(-1, 0, 2);
    scene.add(fillLight);

    // Create Eggbert
    const createEggbert = () => {
      const group = new THREE.Group();

      // Egg body with better proportions
      const bodyGroup = new THREE.Group();
      
      // Main egg shape
      const eggGeometry = new THREE.SphereGeometry(0.6, 32, 32);
      eggGeometry.scale(1, 1.3, 1);
      
      const eggMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(currentTraits.eggColor),
        shininess: 60,
        specular: 0xffffff,
        emissive: new THREE.Color(currentTraits.eggColor),
        emissiveIntensity: 0.05
      });
      
      const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
      eggMesh.castShadow = true;
      eggMesh.receiveShadow = true;
      bodyGroup.add(eggMesh);
      
      // Add subtle texture/detail to egg
      const detailGeometry = new THREE.SphereGeometry(0.58, 64, 64);
      detailGeometry.scale(1, 1.32, 1);
      const detailMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(currentTraits.accentColor),
        opacity: 0.3,
        transparent: true
      });
      const detailMesh = new THREE.Mesh(detailGeometry, detailMaterial);
      bodyGroup.add(detailMesh);
      
      group.add(bodyGroup);

      // Face group
      const faceGroup = new THREE.Group();
      faceGroup.position.y = 0.3;

      // Eyes
      const createEye = (xPos) => {
        const eyeGroup = new THREE.Group();
        
        // Eye socket (subtle indent)
        const socketGeometry = new THREE.SphereGeometry(currentTraits.eyeSize * 1.2, 32, 32);
        const socketMaterial = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color(currentTraits.eggColor).multiplyScalar(0.95),
          shininess: 30
        });
        const socket = new THREE.Mesh(socketGeometry, socketMaterial);
        socket.position.z = -0.02;
        eyeGroup.add(socket);
        
        // Eye white
        const eyeWhiteGeometry = new THREE.SphereGeometry(currentTraits.eyeSize, 32, 32);
        const eyeWhiteMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xffffff,
          shininess: 90,
          emissive: 0xffffff,
          emissiveIntensity: 0.02
        });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eyeGroup.add(eyeWhite);

        // Iris
        const irisGeometry = new THREE.CircleGeometry(currentTraits.eyeSize * 0.55, 32);
        const irisMaterial = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color(currentTraits.irisColor),
          shininess: 80
        });
        const iris = new THREE.Mesh(irisGeometry, irisMaterial);
        iris.position.z = currentTraits.eyeSize * 0.9;
        eyeGroup.add(iris);

        // Pupil
        const pupilGeometry = new THREE.CircleGeometry(currentTraits.pupilSize, 32);
        const pupilMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x000000,
          shininess: 100
        });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.z = currentTraits.eyeSize * 0.92;
        eyeGroup.add(pupil);

        // Eye highlight
        const highlightGeometry = new THREE.SphereGeometry(currentTraits.eyeSize * 0.12, 16, 16);
        const highlightMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          opacity: 0.9,
          transparent: true
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(currentTraits.eyeSize * 0.15, currentTraits.eyeSize * 0.15, currentTraits.eyeSize * 0.95);
        eyeGroup.add(highlight);

        eyeGroup.position.set(xPos * 0.35, 0, 0.48);
        return eyeGroup;
      };

      const leftEye = createEye(-1);
      const rightEye = createEye(1);
      leftEyeRef.current = leftEye;
      rightEyeRef.current = rightEye;
      
      faceGroup.add(leftEye);
      faceGroup.add(rightEye);

      // Eyelids for blinking
      if (isBlinking) {
        const createEyelid = (xPos) => {
          const eyelidGeometry = new THREE.SphereGeometry(
            currentTraits.eyeSize * 1.1,
            32,
            16,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
          );
          const eyelidMaterial = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color(currentTraits.eggColor),
            side: THREE.DoubleSide
          });
          const eyelid = new THREE.Mesh(eyelidGeometry, eyelidMaterial);
          eyelid.position.set(xPos * 0.35, 0, 0.49);
          return eyelid;
        };

        faceGroup.add(createEyelid(-1));
        faceGroup.add(createEyelid(1));
      }

      // Eyebrows
      const eyebrowGeometry = new THREE.BoxGeometry(0.18, currentTraits.eyebrowThickness, 0.05);
      const eyebrowMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(currentTraits.eggColor).multiplyScalar(0.6)
      });
      
      const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
      leftEyebrow.position.set(-0.35, 0.25, 0.5);
      leftEyebrow.rotation.z = 0.1;
      faceGroup.add(leftEyebrow);
      
      const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
      rightEyebrow.position.set(0.35, 0.25, 0.5);
      rightEyebrow.rotation.z = -0.1;
      faceGroup.add(rightEyebrow);

      // Mouth
      const mouthCurve = new THREE.EllipseCurve(
        0, 0,
        currentTraits.mouthWidth, currentTraits.mouthWidth * 0.3,
        0, Math.PI,
        false,
        0
      );
      
      const points = mouthCurve.getPoints(32);
      const mouthGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const mouthMaterial = new THREE.LineBasicMaterial({ 
        color: 0x333333,
        linewidth: 3
      });
      const mouth = new THREE.Line(mouthGeometry, mouthMaterial);
      mouth.position.set(0, -0.15, 0.52);
      mouth.rotation.z = Math.PI;
      faceGroup.add(mouth);

      group.add(faceGroup);

      // Arms (simplified but properly proportioned)
      const createArm = (side) => {
        const armGroup = new THREE.Group();
        
        // Upper arm
        const upperArmGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 8, 16);
        const armMaterial = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color(currentTraits.eggColor).multiplyScalar(0.95),
          shininess: 60
        });
        const upperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        upperArm.position.y = -0.12;
        upperArm.rotation.z = side * 0.3;
        upperArm.castShadow = true;
        armGroup.add(upperArm);
        
        // Lower arm
        const lowerArmGeometry = new THREE.CapsuleGeometry(0.05, 0.2, 8, 16);
        const lowerArm = new THREE.Mesh(lowerArmGeometry, armMaterial);
        lowerArm.position.set(side * 0.08, -0.3, 0);
        lowerArm.rotation.z = side * 0.2;
        lowerArm.castShadow = true;
        armGroup.add(lowerArm);
        
        // Hand
        const handGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const hand = new THREE.Mesh(handGeometry, armMaterial);
        hand.position.set(side * 0.12, -0.45, 0);
        hand.scale.set(1, 1.1, 0.8);
        hand.castShadow = true;
        armGroup.add(hand);
        
        armGroup.position.set(side * 0.55, 0.1, 0);
        return armGroup;
      };
      
      group.add(createArm(-1));
      group.add(createArm(1));

      // Legs (properly grounded)
      const createLeg = (side) => {
        const legGroup = new THREE.Group();
        
        // Upper leg
        const upperLegGeometry = new THREE.CapsuleGeometry(0.08, 0.3, 8, 16);
        const legMaterial = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color(currentTraits.eggColor).multiplyScalar(0.95),
          shininess: 60
        });
        const upperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
        upperLeg.position.y = -0.15;
        upperLeg.castShadow = true;
        legGroup.add(upperLeg);
        
        // Lower leg
        const lowerLegGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 8, 16);
        const lowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
        lowerLeg.position.y = -0.42;
        lowerLeg.castShadow = true;
        legGroup.add(lowerLeg);
        
        // Shoe
        const shoeGroup = new THREE.Group();
        
        // Shoe base
        const shoeGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.22);
        const shoeMaterial = new THREE.MeshPhongMaterial({ 
          color: evolutionStage === 'baby' ? 0x4169E1 : 
                 evolutionStage === 'child' ? 0xFF4444 :
                 evolutionStage === 'teen' ? 0x44AA44 :
                 evolutionStage === 'adult' ? 0x6633CC :
                 0x333333,
          shininess: 80
        });
        const shoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        shoe.position.y = -0.04;
        shoe.castShadow = true;
        shoeGroup.add(shoe);
        
        // Shoe detail
        const shoeDetailGeometry = new THREE.BoxGeometry(0.13, 0.02, 0.2);
        const shoeDetail = new THREE.Mesh(shoeDetailGeometry, shoeMaterial);
        shoeDetail.position.y = -0.09;
        shoeGroup.add(shoeDetail);
        
        shoeGroup.position.y = -0.6;
        legGroup.add(shoeGroup);
        
        legGroup.position.set(side * 0.2, -0.65, 0);
        return legGroup;
      };
      
      group.add(createLeg(-1));
      group.add(createLeg(1));

      // Accessories
      if (evolutionStage === 'child' && currentTraits.accessories.includes('cap')) {
        const capGroup = new THREE.Group();
        
        // Cap dome
        const capGeometry = new THREE.SphereGeometry(
          0.5,
          32,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const capMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xFF6B6B,
          side: THREE.DoubleSide
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.scale.y = 0.5;
        capGroup.add(cap);
        
        // Cap brim
        const brimGeometry = new THREE.CylinderGeometry(0.45, 0.5, 0.02, 32);
        const brim = new THREE.Mesh(brimGeometry, capMaterial);
        brim.position.y = -0.01;
        brim.position.z = 0.15;
        brim.rotation.x = -0.2;
        capGroup.add(brim);
        
        capGroup.position.y = 0.75;
        group.add(capGroup);
      }

      if (evolutionStage === 'teen' && currentTraits.accessories.includes('glasses')) {
        const glassesGroup = new THREE.Group();
        
        const createLens = (xPos) => {
          const lensGeometry = new THREE.TorusGeometry(0.15, 0.015, 8, 32);
          const lensMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            metalness: 0.3,
            roughness: 0.7
          });
          const lens = new THREE.Mesh(lensGeometry, lensMaterial);
          lens.position.set(xPos, 0, 0);
          return lens;
        };
        
        glassesGroup.add(createLens(-0.35));
        glassesGroup.add(createLens(0.35));
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 8);
        const bridge = new THREE.Mesh(bridgeGeometry, new THREE.MeshPhongMaterial({ color: 0x333333 }));
        bridge.rotation.z = Math.PI / 2;
        glassesGroup.add(bridge);
        
        glassesGroup.position.set(0, 0.3, 0.5);
        faceGroup.add(glassesGroup);
      }

      // Ground shadow
      const shadowGeometry = new THREE.PlaneGeometry(2, 2);
      const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
      const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -1.33;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);

      // Scale the entire character
      group.scale.set(currentTraits.scale, currentTraits.scale, currentTraits.scale);
      
      return group;
    };

    const eggbert = createEggbert();
    scene.add(eggbert);
    eggRef.current = eggbert;

    // Animation loop
    const clock = new THREE.Clock();
    let time = 0;
    
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = clock.getDelta();
      time += deltaTime;
      
      if (eggRef.current) {
        // Subtle idle animation
        if (!isJumping && !isDancing) {
          // Gentle breathing effect
          eggRef.current.scale.y = currentTraits.scale * (1 + Math.sin(time * 2) * 0.01);
          
          // Very subtle sway
          eggRef.current.rotation.z = Math.sin(time * 1.5) * 0.02;
          
          // Slight bounce
          eggRef.current.position.y = Math.sin(time * currentTraits.bounceSpeed) * 0.02;
        }
        
        // Eye tracking
        if (leftEyeRef.current && rightEyeRef.current) {
          const maxRotation = 0.15;
          leftEyeRef.current.rotation.x = eyeFollow.y * maxRotation;
          leftEyeRef.current.rotation.y = eyeFollow.x * maxRotation;
          rightEyeRef.current.rotation.x = eyeFollow.y * maxRotation;
          rightEyeRef.current.rotation.y = eyeFollow.x * maxRotation;
        }
        
        // Animate arms
        const arms = eggRef.current.children.filter(child => 
          child.position.x !== 0 && Math.abs(child.position.y - 0.1) < 0.01
        );
        
        arms.forEach((arm, index) => {
          const side = arm.position.x > 0 ? 1 : -1;
          arm.rotation.z = side * 0.05 + Math.sin(time * 2 + index * Math.PI) * 0.03;
          
          if (isHovered && side > 0) {
            arm.rotation.z = Math.sin(time * 5) * 0.2;
            arm.rotation.x = Math.cos(time * 5) * 0.1;
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [evolutionStage, currentTraits, isHovered, eyeFollow, isJumping, isDancing, isBlinking]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = (e.clientX - centerX) / rect.width;
        const y = (e.clientY - centerY) / rect.height;
        setEyeFollow({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, -y)) });
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Interactions
  const handleClick = () => {
    const messages = currentTraits.messages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);
    setIsJumping(true);
    setShowParticles(true);
    setMood('excited');
    
    setTimeout(() => {
      setMessage('');
      setIsJumping(false);
      setMood('happy');
    }, 3000);
    
    setTimeout(() => {
      setShowParticles(false);
    }, 2000);
  };

  const handleDoubleClick = () => {
    setIsDancing(true);
    setMood('excited');
    setTimeout(() => {
      setIsDancing(false);
      setMood('happy');
    }, 5000);
  };

  return (
    <motion.div 
      className="fixed bottom-2 right-2 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Message bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10"
          >
            <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shadow-lg">
              <motion.div
                animate={{ y: [0, -1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {message}
              </motion.div>
              <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-indigo-600 to-purple-600 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Container */}
      <motion.div
        ref={containerRef}
        className="relative cursor-pointer select-none"
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: "preserve-3d"
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          y: isJumping ? [0, -30, -15, 0] : 0,
          rotate: isDancing ? [0, 360] : 0
        }}
        transition={{
          y: { duration: 0.8, times: [0, 0.3, 0.6, 1], ease: "easeOut" },
          rotate: { duration: 1, repeat: isDancing ? Infinity : 0, ease: "linear" }
        }}
      />

      {/* Particles */}
      <AnimatePresence>
        {showParticles && (
          <motion.div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [0, 1, 0.5],
                  x: (Math.random() - 0.5) * 120,
                  y: -Math.random() * 100 - 20,
                  rotate: Math.random() * 360
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div 
                  className="text-lg"
                  style={{ 
                    color: currentTraits.particleColor,
                    filter: 'drop-shadow(0 0 8px currentColor)'
                  }}
                >
                  {['💰', '📈', '✨', '🌟', '💎', '🚀', '🎯', '💸'][i % 8]}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name and evolution indicator */}
      <motion.div
        className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-center">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Eggbert</h3>
          <div className="flex items-center justify-center space-x-1 mt-1">
            {Object.keys(stageTraits).map((stage, index) => (
              <motion.div
                key={stage}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  index <= Object.keys(stageTraits).indexOf(evolutionStage)
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    : 'bg-gray-400 dark:bg-gray-600'
                }`}
                whileHover={{ scale: 1.5 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EggMascot;