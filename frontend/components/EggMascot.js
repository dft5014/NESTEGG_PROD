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
  const frameRef = useRef(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [evolutionStage, setEvolutionStage] = useState('baby');
  const [mood, setMood] = useState('happy');
  const [message, setMessage] = useState('');
  const [showParticles, setShowParticles] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isDancing, setIsDancing] = useState(false);
  const [eyeFollow, setEyeFollow] = useState({ x: 0, y: 0 });
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

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
      scale: 0.8,
      color: '#FFE5B4',
      accentColor: '#FFD700',
      bounceSpeed: 2,
      accessories: [],
      messages: ["Goo goo! 👶", "Me help grow! 🌱", "Nest egg tiny! 🥚", "Save save! 💰"],
      particleColor: '#FFD700',
      hatType: null,
      personality: 'playful'
    },
    child: {
      scale: 0.9,
      color: '#FFDAB9',
      accentColor: '#FFA500',
      bounceSpeed: 2.5,
      accessories: ['cap'],
      messages: ["Growing strong! 💪", "Compound magic! ✨", "Let's save more! 🐷", "Portfolio power! 📈"],
      particleColor: '#FFA500',
      hatType: 'cap',
      personality: 'energetic'
    },
    teen: {
      scale: 1,
      color: '#FFD4A3',
      accentColor: '#FF8C00',
      bounceSpeed: 3,
      accessories: ['glasses', 'headphones'],
      messages: ["Investing smart! 🧠", "Risk balanced! ⚖️", "Diversify! 🌍", "Future bright! 🌟"],
      particleColor: '#FF69B4',
      hatType: 'cool',
      personality: 'confident'
    },
    adult: {
      scale: 1.1,
      color: '#FFCBA4',
      accentColor: '#FF6347',
      bounceSpeed: 3.5,
      accessories: ['tie', 'briefcase'],
      messages: ["Executive moves! 💼", "Strategic growth! 📊", "Wealth building! 🏗️", "Success! 🎯"],
      particleColor: '#4169E1',
      hatType: 'professional',
      personality: 'sophisticated'
    },
    wise: {
      scale: 1.2,
      color: '#FFC39B',
      accentColor: '#8B4513',
      bounceSpeed: 4,
      accessories: ['monocle', 'tophat', 'cane'],
      messages: ["Sage wisdom! 🦉", "Legacy secured! 🏛️", "Master investor! 👑", "Enlightened! ✨"],
      particleColor: '#9370DB',
      hatType: 'tophat',
      personality: 'wise'
    }
  };

  const currentTraits = stageTraits[evolutionStage];

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      1,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(200, 250);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = -2;
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    // Create Eggbert
    const createEggbert = () => {
      const group = new THREE.Group();

      // Body (egg shape)
      const eggGeometry = new THREE.SphereGeometry(1, 32, 32);
      eggGeometry.scale(1, 1.3, 1);
      
      const eggMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(currentTraits.color),
        shininess: 100,
        specular: 0xffffff,
        emissive: new THREE.Color(currentTraits.color),
        emissiveIntensity: 0.1
      });
      
      const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
      eggMesh.castShadow = true;
      eggMesh.receiveShadow = true;
      group.add(eggMesh);

      // Eyes
      const eyeGroup = new THREE.Group();
      eyeGroup.position.y = 0.3;

      // Eye whites
      const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.3, 0, 0.8);
      eyeGroup.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.3, 0, 0.8);
      eyeGroup.add(rightEye);

      // Pupils
      const pupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
      
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil.position.set(-0.3, 0, 0.9);
      eyeGroup.add(leftPupil);
      
      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil.position.set(0.3, 0, 0.9);
      eyeGroup.add(rightPupil);

      // Eye sparkles
      const sparkleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      const leftSparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      leftSparkle.position.set(-0.32, 0.05, 0.92);
      eyeGroup.add(leftSparkle);
      
      const rightSparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
      rightSparkle.position.set(0.28, 0.05, 0.92);
      eyeGroup.add(rightSparkle);

      group.add(eyeGroup);

      // Mouth (simple smile)
      const smileGeometry = new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI);
      const smileMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
      const smile = new THREE.Mesh(smileGeometry, smileMaterial);
      smile.position.set(0, -0.2, 0.8);
      smile.rotation.z = Math.PI;
      group.add(smile);

      // Arms
      const armGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 8);
      const armMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(currentTraits.accentColor) 
      });
      
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.8, 0, 0);
      leftArm.rotation.z = Math.PI / 4;
      leftArm.castShadow = true;
      group.add(leftArm);
      
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.8, 0, 0);
      rightArm.rotation.z = -Math.PI / 4;
      rightArm.castShadow = true;
      group.add(rightArm);

      // Legs
      const legGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.6, 8);
      const legMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(currentTraits.accentColor) 
      });
      
      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.3, -1.2, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.3, -1.2, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      // Accessories based on evolution
      if (evolutionStage === 'child' || currentTraits.hatType === 'cap') {
        const capGeometry = new THREE.ConeGeometry(0.6, 0.4, 16);
        const capMaterial = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 1.2;
        cap.rotation.z = 0.2;
        group.add(cap);
      }

      if (evolutionStage === 'teen') {
        // Glasses
        const glassesGroup = new THREE.Group();
        const frameGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        leftFrame.position.set(-0.3, 0.3, 0.85);
        glassesGroup.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        rightFrame.position.set(0.3, 0.3, 0.85);
        glassesGroup.add(rightFrame);
        
        const bridgeGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.02);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.set(0, 0.3, 0.85);
        glassesGroup.add(bridge);
        
        group.add(glassesGroup);
      }

      if (evolutionStage === 'adult') {
        // Tie
        const tieGeometry = new THREE.ConeGeometry(0.15, 0.6, 4);
        const tieMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
        const tie = new THREE.Mesh(tieGeometry, tieMaterial);
        tie.position.set(0, -0.5, 0.9);
        tie.rotation.z = Math.PI;
        group.add(tie);
      }

      if (evolutionStage === 'wise') {
        // Top hat
        const hatGroup = new THREE.Group();
        const hatCylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
        const hatBrimGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
        const hatMaterial = new THREE.MeshPhongMaterial({ color: 0x1A1A1A });
        
        const hatTop = new THREE.Mesh(hatCylinderGeometry, hatMaterial);
        hatTop.position.y = 0.4;
        hatGroup.add(hatTop);
        
        const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial);
        hatGroup.add(hatBrim);
        
        hatGroup.position.y = 1.3;
        group.add(hatGroup);

        // Monocle
        const monocleGeometry = new THREE.TorusGeometry(0.25, 0.02, 8, 16);
        const monocleMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
        const monocle = new THREE.Mesh(monocleGeometry, monocleMaterial);
        monocle.position.set(0.35, 0.3, 0.85);
        group.add(monocle);
      }

      // Shadow plane
      const shadowGeometry = new THREE.PlaneGeometry(3, 3);
      const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -1.5;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);

      group.scale.set(currentTraits.scale, currentTraits.scale, currentTraits.scale);
      return group;
    };

    const eggbert = createEggbert();
    scene.add(eggbert);
    eggRef.current = eggbert;

    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();
      
      if (eggRef.current) {
        // Idle animation - gentle bounce and sway
        if (!isJumping && !isDancing) {
          eggRef.current.position.y = Math.sin(elapsedTime * currentTraits.bounceSpeed) * 0.1;
          eggRef.current.rotation.z = Math.sin(elapsedTime * 1.5) * 0.05;
        }
        
        // Eye tracking
        const eyeGroup = eggRef.current.children.find(child => child.position.y === 0.3);
        if (eyeGroup) {
          eyeGroup.rotation.x = eyeFollow.y * 0.2;
          eyeGroup.rotation.y = eyeFollow.x * 0.2;
        }
        
        // Hover effect
        if (isHovered) {
          eggRef.current.rotation.y += 0.02;
        }
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
  }, [evolutionStage, currentTraits, isHovered, eyeFollow, isJumping, isDancing]);

  // Mouse tracking for eye follow
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = (e.clientX - centerX) / rect.width;
        const y = (e.clientY - centerY) / rect.height;
        setEyeFollow({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
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
    
    setTimeout(() => {
      setMessage('');
      setIsJumping(false);
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

  // Handle cartwheel
  useEffect(() => {
    if (isDoingCartwheel && eggRef.current) {
      const startRotation = eggRef.current.rotation.x;
      let progress = 0;
      
      const doCartwheel = () => {
        progress += 0.05;
        if (progress <= 1) {
          eggRef.current.rotation.x = startRotation + (Math.PI * 2 * progress);
          eggRef.current.position.x = Math.sin(progress * Math.PI) * 2;
          requestAnimationFrame(doCartwheel);
        } else {
          eggRef.current.rotation.x = startRotation;
          eggRef.current.position.x = 0;
        }
      };
      
      doCartwheel();
    }
  }, [isDoingCartwheel]);

  return (
    <motion.div 
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, rotate: -360 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, duration: 1 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: isHovered ? 1 : 0.5,
          scale: isHovered ? 1.2 : 1
        }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-yellow-300/30 via-orange-300/20 to-transparent rounded-full blur-xl" />
      </motion.div>

      {/* Message bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap shadow-2xl"
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2"
            >
              <span>{message}</span>
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </motion.div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-indigo-600 to-purple-600 rotate-45" />
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
          y: isJumping ? [-20, -40, -20, 0] : 0,
          rotate: isDancing ? [0, 360, -360, 0] : 0
        }}
        transition={{
          y: { duration: 1, times: [0, 0.5, 0.8, 1] },
          rotate: { duration: 2, repeat: isDancing ? Infinity : 0 }
        }}
      />

      {/* Particles */}
      <AnimatePresence>
        {showParticles && (
          <motion.div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
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
                  scale: [0, 1.5, 0.5],
                  x: (Math.random() - 0.5) * 200,
                  y: -Math.random() * 150 - 50
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div 
                  className="text-2xl"
                  style={{ 
                    color: currentTraits.particleColor,
                    filter: 'drop-shadow(0 0 10px currentColor)'
                  }}
                >
                  {['💰', '📈', '✨', '🌟', '💎', '🚀'][i % 6]}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name and status */}
      <motion.div
        className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Eggbert</h3>
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center space-x-1">
              {Object.keys(stageTraits).map((stage, index) => (
                <motion.div
                  key={stage}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index <= Object.keys(stageTraits).indexOf(evolutionStage)
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      : 'bg-gray-400'
                  }`}
                  animate={{
                    scale: index === Object.keys(stageTraits).indexOf(evolutionStage) ? [1, 1.5, 1] : 1
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1 capitalize">
            {evolutionStage} Stage • {currentTraits.personality}
          </p>
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="absolute -bottom-28 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 2 }}
      >
        Click to interact • Double-click to dance
      </motion.div>
    </motion.div>
  );
};

export default EggMascot;