import * as THREE from 'three';
import { CharacterConfig } from '../types/character';
import {
  createFaceTexture,
  createNotebookTexture,
  createTopiSDTexture,
  createUniformBackTexture,
  createUniformFrontTexture,
} from '../utils/proceduralTextures';

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  bevelRadius = 0.05
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = width - bevelRadius * 2;
  const h = height - bevelRadius * 2;
  const r = 0.02;

  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevelRadius * 2,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevelRadius,
    bevelThickness: bevelRadius,
  });
  geo.center();
  return geo;
}

export class RobloxSDCharacter {
  public readonly root = new THREE.Group();
  public readonly hips = new THREE.Group();
  public readonly torso = new THREE.Group();
  public readonly headPivot = new THREE.Group();
  public readonly face3DGroup = new THREE.Group();
  public readonly eyesGroup = new THREE.Group();
  public readonly mouthGroup = new THREE.Group();
  public readonly hatGroup = new THREE.Group();
  public readonly hairGroup = new THREE.Group();
  public readonly tieGroup = new THREE.Group();
  public readonly skirtMeshGroup = new THREE.Group();
  public readonly backpackGroup = new THREE.Group();
  public readonly leftArmPivot = new THREE.Group();
  public readonly rightArmPivot = new THREE.Group();
  public readonly leftLegPivot = new THREE.Group();
  public readonly rightLegPivot = new THREE.Group();
  public readonly handPropGroup = new THREE.Group();

  private currentExploded = 0;
  private maxAnisotropy = 4;

  // Materials for dynamic updates
  private skinMat: THREE.MeshStandardMaterial;
  private faceMat: THREE.MeshStandardMaterial;
  private torsoMats: THREE.MeshStandardMaterial[];
  private sleeveMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private sockMat: THREE.MeshStandardMaterial;
  private shoeMat: THREE.MeshStandardMaterial;

  // Track last config keys to avoid unnecessary canvas texture regeneration
  private lastFaceKey = '';
  private lastUniformKey = '';

  constructor(initialConfig: CharacterConfig, maxAnisotropy = 4) {
    this.maxAnisotropy = maxAnisotropy;

    // 1. Initialize calibrated PBR materials (varied roughness >= 0.25 across parts)
    this.skinMat = new THREE.MeshStandardMaterial({
      color: initialConfig.skinTone,
      roughness: 0.42, // Smooth plastic-toy Roblox skin finish
      metalness: 0.04,
    });

    const faceTex = createFaceTexture(
      initialConfig.skinTone,
      initialConfig.expression,
      this.maxAnisotropy
    );
    this.faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.38,
      metalness: 0.04,
    });

    const frontTex = createUniformFrontTexture(
      initialConfig.uniform,
      initialConfig.studentName,
      this.maxAnisotropy
    );
    const backTex = createUniformBackTexture(initialConfig.uniform, this.maxAnisotropy);
    const sideShirtMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.78, // Matte woven school cotton fabric
      metalness: 0.02,
    });

    this.torsoMats = [
      sideShirtMat, // right
      sideShirtMat, // left
      sideShirtMat, // top
      sideShirtMat, // bottom
      new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.75, metalness: 0.02 }), // front
      new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.75, metalness: 0.02 }), // back
    ];

    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.78,
      metalness: 0.02,
    });

    this.pantsMat = new THREE.MeshStandardMaterial({
      color: '#881337', // Merah Hati SD
      roughness: 0.82,
      metalness: 0.02,
    });

    this.sockMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.85,
      metalness: 0.0,
    });

    this.shoeMat = new THREE.MeshStandardMaterial({
      color: '#18181B',
      roughness: 0.28, // Polished black school shoes
      metalness: 0.15,
    });

    this.buildHierarchy();
    this.applyConfig(initialConfig);
  }

  private buildHierarchy() {
    // Character total height ~ 3.35 units, bottom of shoes at y = 0.0
    this.hips.position.set(0, 1.22, 0);
    this.root.add(this.hips);

    // --- TORSO ASSEMBLY (Width 1.24, Height 1.24, Depth 0.64) ---
    this.torso.position.set(0, 0.62, 0);
    this.hips.add(this.torso);

    // Beveled Roblox torso core + textured front/back plates so UVs map 1:1
    const torsoCoreGeo = createRoundedBoxGeometry(1.24, 1.24, 0.64, 0.06);
    const torsoCoreMesh = new THREE.Mesh(torsoCoreGeo, this.torsoMats[0]);
    torsoCoreMesh.castShadow = true;
    torsoCoreMesh.receiveShadow = true;
    this.torso.add(torsoCoreMesh);

    const plateGeo = new THREE.PlaneGeometry(1.12, 1.12);
    const frontPlate = new THREE.Mesh(plateGeo, this.torsoMats[4]);
    frontPlate.position.set(0, 0, 0.324);
    frontPlate.receiveShadow = true;
    frontPlate.userData.skipSoftwareRender = true;
    this.torso.add(frontPlate);

    const backPlate = new THREE.Mesh(plateGeo, this.torsoMats[5]);
    backPlate.position.set(0, 0, -0.324);
    backPlate.rotation.y = Math.PI;
    backPlate.receiveShadow = true;
    backPlate.userData.skipSoftwareRender = true;
    this.torso.add(backPlate);

    // 3D Chest Pocket & Tut Wuri Emblem Accent for Software & 3D Depth
    const pocketMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.28, 0.025),
      this.sleeveMat
    );
    pocketMesh.position.set(0.26, 0.14, 0.322);
    const badgeAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.032),
      new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.35 })
    );
    badgeAccent.position.set(0.26, 0.16, 0.326);
    this.torso.add(pocketMesh, badgeAccent);

    // 3D Folded Shirt Collar (Left & Right lapels)
    const collarGeo = createRoundedBoxGeometry(0.38, 0.12, 0.28, 0.02);
    const leftCollar = new THREE.Mesh(collarGeo, this.sleeveMat);
    leftCollar.position.set(-0.24, 0.62, 0.18);
    leftCollar.rotation.set(0.15, 0.2, -0.22);
    this.torso.add(leftCollar);

    const rightCollar = new THREE.Mesh(collarGeo, this.sleeveMat);
    rightCollar.position.set(0.24, 0.62, 0.18);
    rightCollar.rotation.set(0.15, -0.2, 0.22);
    this.torso.add(rightCollar);

    // Gold 3D Belt Buckle accent on waist
    const buckleMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      roughness: 0.22,
      metalness: 0.88,
    });
    const buckleMesh = new THREE.Mesh(createRoundedBoxGeometry(0.26, 0.16, 0.08, 0.015), buckleMat);
    buckleMesh.position.set(0, -0.52, 0.33);
    this.torso.add(buckleMesh);

    // Attach Tie/Neckerchief, Skirt, and Backpack groups to Torso
    this.torso.add(this.tieGroup);
    this.torso.add(this.skirtMeshGroup);
    this.torso.add(this.backpackGroup);

    // --- HEAD ASSEMBLY (Classic Roblox Beveled Cylinder + Ears + Face Plate) ---
    this.headPivot.position.set(0, 0.64, 0);
    this.torso.add(this.headPivot);

    // Neck cylinder
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.18, 24),
      this.skinMat
    );
    neckMesh.position.set(0, 0.06, 0);
    this.headPivot.add(neckMesh);

    // Roblox Classic Head (Beveled blocky-cylinder hybrid)
    const headBodyGeo = createRoundedBoxGeometry(0.88, 0.86, 0.84, 0.16);
    const headMesh = new THREE.Mesh(headBodyGeo, this.skinMat);
    headMesh.position.set(0, 0.52, 0);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.headPivot.add(headMesh);

    // Top stud / head bevel cap
    const headCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.08, 24),
      this.skinMat
    );
    headCap.position.set(0, 0.96, 0);
    this.headPivot.add(headCap);

    // Face Curved Decal Plane on front of Head
    const facePlaneGeo = new THREE.PlaneGeometry(0.68, 0.68);
    const facePlane = new THREE.Mesh(facePlaneGeo, this.faceMat);
    facePlane.position.set(0, 0.52, 0.422);
    facePlane.userData.skipSoftwareRender = true;
    this.headPivot.add(facePlane);

    // 3D Sculpted Facial Expression Features (Eyebrows, Eyes + Catchlights, Blush, Mouth, Glasses)
    this.headPivot.add(this.face3DGroup);

    // Blocky Ears
    const earGeo = createRoundedBoxGeometry(0.12, 0.24, 0.16, 0.03);
    const leftEar = new THREE.Mesh(earGeo, this.skinMat);
    leftEar.position.set(-0.46, 0.52, 0);
    const rightEar = new THREE.Mesh(earGeo, this.skinMat);
    rightEar.position.set(0.46, 0.52, 0);
    this.headPivot.add(leftEar, rightEar);

    this.headPivot.add(this.hairGroup);
    this.headPivot.add(this.hatGroup);

    // --- ARMS (Left & Right Articulated Pivots at Shoulders) ---
    this.leftArmPivot.position.set(-0.92, 0.52, 0);
    this.rightArmPivot.position.set(0.92, 0.52, 0);
    this.torso.add(this.leftArmPivot, this.rightArmPivot);

    this.buildArm(this.leftArmPivot, false);
    this.buildArm(this.rightArmPivot, true);

    // --- LEGS (Left & Right Articulated Pivots at Hips) ---
    this.leftLegPivot.position.set(-0.32, 0, 0);
    this.rightLegPivot.position.set(0.32, 0, 0);
    this.hips.add(this.leftLegPivot, this.rightLegPivot);

    this.buildLeg(this.leftLegPivot);
    this.buildLeg(this.rightLegPivot);
  }

  private buildArm(pivot: THREE.Group, isRight: boolean) {
    // Upper Short Sleeve (Seragam SD)
    const sleeveGeo = createRoundedBoxGeometry(0.56, 0.54, 0.56, 0.05);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, this.sleeveMat);
    sleeveMesh.position.set(0, -0.18, 0);
    sleeveMesh.castShadow = true;
    sleeveMesh.receiveShadow = true;
    pivot.add(sleeveMesh);

    // Sleeve cuff trim
    const cuffGeo = createRoundedBoxGeometry(0.58, 0.08, 0.58, 0.02);
    const cuffMesh = new THREE.Mesh(cuffGeo, this.sleeveMat);
    cuffMesh.position.set(0, -0.43, 0);
    pivot.add(cuffMesh);

    // Lower Forearm (Skin)
    const forearmGeo = createRoundedBoxGeometry(0.50, 0.56, 0.50, 0.05);
    const forearmMesh = new THREE.Mesh(forearmGeo, this.skinMat);
    forearmMesh.position.set(0, -0.70, 0);
    forearmMesh.castShadow = true;
    pivot.add(forearmMesh);

    // Roblox Blocky Hand / Gripper
    const handGeo = createRoundedBoxGeometry(0.46, 0.22, 0.48, 0.05);
    const handMesh = new THREE.Mesh(handGeo, this.skinMat);
    handMesh.position.set(0, -1.02, 0);
    handMesh.castShadow = true;
    pivot.add(handMesh);

    if (isRight) {
      this.handPropGroup.position.set(0, -1.05, 0.28);
      pivot.add(this.handPropGroup);
    }
  }

  private buildLeg(pivot: THREE.Group) {
    // Upper Pants / Shorts (Celana Merah Hati SD)
    const shortsGeo = createRoundedBoxGeometry(0.58, 0.58, 0.60, 0.05);
    const shortsMesh = new THREE.Mesh(shortsGeo, this.pantsMat);
    shortsMesh.position.set(0, -0.29, 0);
    shortsMesh.castShadow = true;
    shortsMesh.receiveShadow = true;
    pivot.add(shortsMesh);

    // Knee / Lower Leg Skin
    const calfSkinGeo = createRoundedBoxGeometry(0.52, 0.22, 0.52, 0.03);
    const calfSkinMesh = new THREE.Mesh(calfSkinGeo, this.skinMat);
    calfSkinMesh.position.set(0, -0.66, 0);
    calfSkinMesh.castShadow = true;
    pivot.add(calfSkinMesh);

    // Kaos Kaki Putih Anak SD (With twin black athletic stripes)
    const sockGeo = createRoundedBoxGeometry(0.53, 0.32, 0.54, 0.03);
    const sockMesh = new THREE.Mesh(sockGeo, this.sockMat);
    sockMesh.position.set(0, -0.88, 0);
    sockMesh.castShadow = true;
    pivot.add(sockMesh);

    const stripeMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8 });
    const stripeGeo = createRoundedBoxGeometry(0.545, 0.035, 0.555, 0.01);
    const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe1.position.set(0, -0.76, 0);
    const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripe2.position.set(0, -0.82, 0);
    pivot.add(stripe1, stripe2);

    // Sepatu Sekolah Hitam + Sol Putih (Bottom exactly at y = -1.22 -> world y = 0.0)
    const shoeUpperGeo = createRoundedBoxGeometry(0.58, 0.20, 0.72, 0.04);
    const shoeUpper = new THREE.Mesh(shoeUpperGeo, this.shoeMat);
    shoeUpper.position.set(0, -1.08, 0.06);
    shoeUpper.castShadow = true;
    shoeUpper.receiveShadow = true;
    pivot.add(shoeUpper);

    // White rubber sole
    const soleMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.65,
      metalness: 0.05,
    });
    const soleGeo = createRoundedBoxGeometry(0.60, 0.07, 0.75, 0.02);
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(0, -1.185, 0.06);
    soleMesh.receiveShadow = true;
    pivot.add(soleMesh);
  }

  private lastAppearanceKey = '';

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (
            m &&
            m !== this.pantsMat &&
            m !== this.skinMat &&
            m !== this.sleeveMat &&
            m !== this.sockMat &&
            m !== this.shoeMat
          ) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      }
    }
  }

  public applyConfig(config: CharacterConfig) {
    const appearanceKey = [
      config.genderStyle,
      config.skinTone,
      config.expression,
      config.uniform,
      config.hairStyle,
      config.hairColor,
      config.hat,
      config.hasTieOrNeckerchief,
      config.hasBackpack,
      config.backpackColor,
      config.handProp,
      config.sockHeight,
      config.studentName,
    ].join('|');
    if (appearanceKey === this.lastAppearanceKey) {
      return;
    }
    this.lastAppearanceKey = appearanceKey;

    // 1. Skin Tone & Face Expression
    this.skinMat.color.set(config.skinTone);
    const faceKey = `${config.skinTone}_${config.expression}`;
    if (faceKey !== this.lastFaceKey) {
      this.lastFaceKey = faceKey;
      if (this.faceMat.map) this.faceMat.map.dispose();
      this.faceMat.map = createFaceTexture(config.skinTone, config.expression, this.maxAnisotropy);
      this.faceMat.needsUpdate = true;
      this.rebuild3DFaceExpression(config.expression);
    }

    // 2. Uniform Preset & Colors
    const uniformKey = `${config.uniform}_${config.studentName}`;
    if (uniformKey !== this.lastUniformKey) {
      this.lastUniformKey = uniformKey;
      if (this.torsoMats[4].map) this.torsoMats[4].map.dispose();
      if (this.torsoMats[5].map) this.torsoMats[5].map.dispose();

      this.torsoMats[4].map = createUniformFrontTexture(
        config.uniform,
        config.studentName,
        this.maxAnisotropy
      );
      this.torsoMats[5].map = createUniformBackTexture(config.uniform, this.maxAnisotropy);
      this.torsoMats[4].needsUpdate = true;
      this.torsoMats[5].needsUpdate = true;
    }

    if (config.uniform === 'merah_putih') {
      this.torsoMats[0].color.set('#F8FAFC');
      this.sleeveMat.color.set('#F8FAFC');
      this.pantsMat.color.set('#881337'); // Merah Hati SD
    } else if (config.uniform === 'pramuka') {
      this.torsoMats[0].color.set('#D6B588');
      this.sleeveMat.color.set('#D6B588');
      this.pantsMat.color.set('#4E321B'); // Cokelat Tua Pramuka
    } else if (config.uniform === 'batik') {
      this.torsoMats[0].color.set('#881337');
      this.sleeveMat.color.set('#881337');
      this.pantsMat.color.set('#881337'); // Bawahan Merah Hati / Putih
    } else {
      // Olahraga
      this.torsoMats[0].color.set('#15803D');
      this.sleeveMat.color.set('#FACC15');
      this.pantsMat.color.set('#14532D'); // Training Hijau Tua
    }

    // 3. Putri Pleated Skirt Overlay (Rok Rempel SD) vs Putra Celana
    this.clearGroup(this.skirtMeshGroup);
    if (config.genderStyle === 'putri' && config.uniform !== 'olahraga') {
      const skirtGeo = createRoundedBoxGeometry(1.30, 0.56, 0.70, 0.04);
      const skirtMesh = new THREE.Mesh(skirtGeo, this.pantsMat);
      skirtMesh.position.set(0, -0.82, 0);
      skirtMesh.castShadow = true;
      this.skirtMeshGroup.add(skirtMesh);
    }

    // 4. Tie (Dasi Merah SD) or Pramuka Neckerchief (Kacu Hasduk Pramuka)
    this.clearGroup(this.tieGroup);
    if (config.hasTieOrNeckerchief && config.uniform !== 'olahraga') {
      if (config.uniform === 'pramuka') {
        // Kacu Pramuka Merah Putih + Ring Kaleng Emas
        const kacuMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.65 });
        const whiteTrimMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.65 });
        const ringMat = new THREE.MeshStandardMaterial({
          color: '#FBBF24',
          roughness: 0.25,
          metalness: 0.85,
        });

        const leftFold = new THREE.Mesh(
          createRoundedBoxGeometry(0.16, 0.36, 0.08, 0.02),
          kacuMat
        );
        leftFold.position.set(-0.11, 0.46, 0.34);
        leftFold.rotation.z = -0.35;

        const rightFold = new THREE.Mesh(
          createRoundedBoxGeometry(0.16, 0.36, 0.08, 0.02),
          kacuMat
        );
        rightFold.position.set(0.11, 0.46, 0.34);
        rightFold.rotation.z = 0.35;

        const ringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 16), ringMat);
        ringMesh.position.set(0, 0.31, 0.35);

        const kacuTip = new THREE.Mesh(
          createRoundedBoxGeometry(0.22, 0.42, 0.06, 0.02),
          kacuMat
        );
        kacuTip.position.set(0, 0.08, 0.35);

        const whiteBorder = new THREE.Mesh(
          createRoundedBoxGeometry(0.24, 0.06, 0.065, 0.01),
          whiteTrimMat
        );
        whiteBorder.position.set(0, -0.08, 0.35);

        this.tieGroup.add(leftFold, rightFold, ringMesh, kacuTip, whiteBorder);
      } else {
        // Dasi Merah Hati SD
        const tieMat = new THREE.MeshStandardMaterial({
          color: '#991B1B',
          roughness: 0.55,
          metalness: 0.08,
        });
        const knotMesh = new THREE.Mesh(
          createRoundedBoxGeometry(0.16, 0.14, 0.08, 0.02),
          tieMat
        );
        knotMesh.position.set(0, 0.50, 0.35);

        const bladeMesh = new THREE.Mesh(
          createRoundedBoxGeometry(0.18, 0.62, 0.06, 0.02),
          tieMat
        );
        bladeMesh.position.set(0, 0.14, 0.35);

        this.tieGroup.add(knotMesh, bladeMesh);
      }
    }

    // 5. Hair Style (3D Blocky Hair)
    this.clearGroup(this.hairGroup);
    const hairMat = new THREE.MeshStandardMaterial({
      color: config.hairColor,
      roughness: 0.65,
      metalness: 0.05,
    });

    // Top hair base
    const topHair = new THREE.Mesh(
      createRoundedBoxGeometry(0.92, 0.24, 0.88, 0.06),
      hairMat
    );
    topHair.position.set(0, 0.86, -0.02);
    topHair.castShadow = true;
    this.hairGroup.add(topHair);

    // Back hair cover
    const backHair = new THREE.Mesh(
      createRoundedBoxGeometry(0.90, 0.52, 0.22, 0.05),
      hairMat
    );
    backHair.position.set(0, 0.62, -0.36);
    this.hairGroup.add(backHair);

    if (config.hairStyle === 'kuncir_dua') {
      // Twin Pigtails + Red-White Scrunchies (Ikatan Rambut Merah Putih)
      const scrunchieMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.5 });
      [-0.54, 0.54].forEach((xPos) => {
        const tie = new THREE.Mesh(createRoundedBoxGeometry(0.14, 0.14, 0.14, 0.02), scrunchieMat);
        tie.position.set(xPos, 0.56, -0.08);
        const tail = new THREE.Mesh(createRoundedBoxGeometry(0.24, 0.48, 0.24, 0.05), hairMat);
        tail.position.set(xPos * 1.15, 0.34, -0.08);
        tail.rotation.z = xPos < 0 ? 0.22 : -0.22;
        tail.castShadow = true;
        this.hairGroup.add(tie, tail);
      });
    } else if (config.hairStyle === 'belah_samping' || config.hairStyle === 'poni_rata') {
      const bangs = new THREE.Mesh(
        createRoundedBoxGeometry(0.84, 0.16, 0.16, 0.03),
        hairMat
      );
      bangs.position.set(0, 0.78, 0.40);
      this.hairGroup.add(bangs);
    }

    // 6. Hat Style (Topi SD Merah Putih, Baret Pramuka, Peci, Pita Rambut)
    this.clearGroup(this.hatGroup);
    if (config.hat === 'topi_sd') {
      const topiTex = createTopiSDTexture(this.maxAnisotropy);
      const crownMat = new THREE.MeshStandardMaterial({
        map: topiTex,
        roughness: 0.72,
        metalness: 0.02,
      });
      const redBrimMat = new THREE.MeshStandardMaterial({
        color: '#991B1B',
        roughness: 0.68,
        metalness: 0.04,
      });

      // Cap dome
      const domeGeo = new THREE.CylinderGeometry(0.46, 0.48, 0.32, 32);
      // Rotate so front panel faces +Z
      domeGeo.rotateY(-Math.PI / 2);
      const domeMesh = new THREE.Mesh(domeGeo, crownMat);
      domeMesh.position.set(0, 0.96, 0);
      domeMesh.castShadow = true;

      // Top cap button
      const topBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.46, 0.08, 24),
        redBrimMat
      );
      topBtn.position.set(0, 1.14, 0);

      // Curved Front Visor of Topi SD
      const visorGeo = createRoundedBoxGeometry(0.82, 0.07, 0.42, 0.025);
      const visorMesh = new THREE.Mesh(visorGeo, redBrimMat);
      visorMesh.position.set(0, 0.83, 0.44);
      visorMesh.rotation.x = 0.12;
      visorMesh.castShadow = true;

      this.hatGroup.add(domeMesh, topBtn, visorMesh);
    } else if (config.hat === 'baret_pramuka') {
      const baretMat = new THREE.MeshStandardMaterial({
        color: '#451A03',
        roughness: 0.85,
      });
      const emblemMat = new THREE.MeshStandardMaterial({
        color: '#FACC15',
        roughness: 0.25,
        metalness: 0.85,
      });
      const baretCrown = new THREE.Mesh(
        createRoundedBoxGeometry(0.98, 0.24, 0.94, 0.09),
        baretMat
      );
      baretCrown.position.set(0.05, 0.98, 0);
      baretCrown.rotation.z = -0.14;
      baretCrown.castShadow = true;

      const badge = new THREE.Mesh(
        createRoundedBoxGeometry(0.18, 0.16, 0.06, 0.02),
        emblemMat
      );
      badge.position.set(-0.22, 0.98, 0.46);
      this.hatGroup.add(baretCrown, badge);
    } else if (config.hat === 'peci') {
      const peciMat = new THREE.MeshStandardMaterial({
        color: '#0F172A',
        roughness: 0.92, // Velvet Songkok/Peci Nasional
      });
      const peciMesh = new THREE.Mesh(
        createRoundedBoxGeometry(0.88, 0.30, 0.86, 0.04),
        peciMat
      );
      peciMesh.position.set(0, 1.0, 0);
      peciMesh.castShadow = true;
      this.hatGroup.add(peciMesh);
    } else if (config.hat === 'pita_rambut') {
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: '#DC2626',
        roughness: 0.45,
      });
      const bowCenter = new THREE.Mesh(
        createRoundedBoxGeometry(0.14, 0.14, 0.14, 0.03),
        ribbonMat
      );
      bowCenter.position.set(0, 1.02, 0.32);
      const bowLeft = new THREE.Mesh(
        createRoundedBoxGeometry(0.24, 0.18, 0.10, 0.03),
        ribbonMat
      );
      bowLeft.position.set(-0.16, 1.04, 0.32);
      bowLeft.rotation.z = 0.2;
      const bowRight = new THREE.Mesh(
        createRoundedBoxGeometry(0.24, 0.18, 0.10, 0.03),
        ribbonMat
      );
      bowRight.position.set(0.16, 1.04, 0.32);
      bowRight.rotation.z = -0.2;
      this.hatGroup.add(bowCenter, bowLeft, bowRight);
    }

    // 7. 3D School Backpack (Tas Ransel Anak SD + Tumbler Botol Minum)
    this.clearGroup(this.backpackGroup);
    if (config.hasBackpack) {
      const bagMainMat = new THREE.MeshStandardMaterial({
        color: config.backpackColor,
        roughness: 0.62,
        metalness: 0.08,
      });
      const bagAccentMat = new THREE.MeshStandardMaterial({
        color: '#FACC15',
        roughness: 0.45,
        metalness: 0.2,
      });
      const strapMat = new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.8,
      });

      // Main compartment
      const mainBag = new THREE.Mesh(
        createRoundedBoxGeometry(0.96, 1.04, 0.44, 0.08),
        bagMainMat
      );
      mainBag.position.set(0, 0.06, -0.52);
      mainBag.castShadow = true;
      mainBag.receiveShadow = true;

      // Front zippered pocket
      const frontPocket = new THREE.Mesh(
        createRoundedBoxGeometry(0.76, 0.52, 0.18, 0.05),
        bagMainMat
      );
      frontPocket.position.set(0, -0.12, -0.78);
      frontPocket.castShadow = true;

      // Reflective yellow safety strip on backpack
      const safetyStrip = new THREE.Mesh(
        createRoundedBoxGeometry(0.68, 0.08, 0.04, 0.01),
        bagAccentMat
      );
      safetyStrip.position.set(0, 0.28, -0.75);

      // Side Water Bottle Tumbler in mesh pocket
      const bottleMat = new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        roughness: 0.2,
        metalness: 0.1,
      });
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.46, 16),
        bottleMat
      );
      bottle.position.set(0.54, -0.12, -0.52);
      const bottleCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.1, 16),
        bagAccentMat
      );
      bottleCap.position.set(0.54, 0.15, -0.52);

      // Shoulder Straps wrapping around torso shoulders
      [-0.36, 0.36].forEach((sx) => {
        const topStrap = new THREE.Mesh(
          createRoundedBoxGeometry(0.14, 0.12, 0.72, 0.02),
          strapMat
        );
        topStrap.position.set(sx, 0.62, -0.02);
        const frontStrap = new THREE.Mesh(
          createRoundedBoxGeometry(0.13, 0.88, 0.08, 0.02),
          strapMat
        );
        frontStrap.position.set(sx, 0.18, 0.33);
        this.backpackGroup.add(topStrap, frontStrap);
      });

      this.backpackGroup.add(mainBag, frontPocket, safetyStrip, bottle, bottleCap);
    }

    // 8. Hand Prop (Buku Tulis SiDu, Es Loli, Penggaris Kayu, Bola Kasti)
    this.clearGroup(this.handPropGroup);
    if (config.handProp === 'buku_sidu') {
      const bookTex = createNotebookTexture(this.maxAnisotropy);
      const bookCoverMat = new THREE.MeshStandardMaterial({
        map: bookTex,
        roughness: 0.45,
      });
      const pagesMat = new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
        roughness: 0.85,
      });
      const bookGeo = createRoundedBoxGeometry(0.48, 0.64, 0.09, 0.015);
      const bookMesh = new THREE.Mesh(bookGeo, pagesMat);
      const coverPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.60), bookCoverMat);
      coverPlane.position.set(0, 0, 0.048);
      coverPlane.userData.skipSoftwareRender = true;

      bookMesh.add(coverPlane);
      bookMesh.rotation.set(0.3, -0.2, 0.1);
      bookMesh.castShadow = true;
      this.handPropGroup.add(bookMesh);
    } else if (config.handProp === 'es_loli') {
      const stickMat = new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.8 });
      const iceMat = new THREE.MeshStandardMaterial({
        color: '#EF4444',
        roughness: 0.18,
        metalness: 0.05,
      });
      const stick = new THREE.Mesh(createRoundedBoxGeometry(0.06, 0.32, 0.03, 0.01), stickMat);
      stick.position.set(0, 0.1, 0);
      const popsicle = new THREE.Mesh(createRoundedBoxGeometry(0.22, 0.42, 0.12, 0.05), iceMat);
      popsicle.position.set(0, 0.38, 0);
      popsicle.castShadow = true;
      this.handPropGroup.add(stick, popsicle);
    } else if (config.handProp === 'penggaris_kayu') {
      const rulerMat = new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.6 });
      const ruler = new THREE.Mesh(createRoundedBoxGeometry(0.14, 0.95, 0.03, 0.01), rulerMat);
      ruler.position.set(0, 0.32, 0);
      ruler.castShadow = true;
      this.handPropGroup.add(ruler);
    } else if (config.handProp === 'bola_kasti') {
      const ballMat = new THREE.MeshStandardMaterial({
        color: '#84CC16',
        roughness: 0.72,
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), ballMat);
      ball.position.set(0, 0.04, 0.08);
      ball.castShadow = true;
      this.handPropGroup.add(ball);
    }
  }

  public updateAnimation(
    elapsed: number,
    delta: number,
    config: CharacterConfig,
    isMovingInPlayMode: boolean,
    isRunningInPlayMode: boolean,
    jumpHeight: number
  ) {
    // 1. Smoothly damp Exploded Rig Separation
    this.currentExploded = THREE.MathUtils.damp(
      this.currentExploded,
      config.explodedFactor,
      7,
      delta
    );
    const e = this.currentExploded;

    // Apply exploded rig offsets relative to rest joint positions
    this.headPivot.position.set(0, 0.64 + e * 0.55, 0);
    this.hatGroup.position.set(0, e * 0.55, 0);
    this.hairGroup.position.set(0, e * 0.25, -e * 0.18);
    this.tieGroup.position.set(0, 0, e * 0.48);
    this.backpackGroup.position.set(0, 0, -e * 0.65);
    this.leftArmPivot.position.set(-0.92 - e * 0.52, 0.52, 0);
    this.rightArmPivot.position.set(0.92 + e * 0.52, 0.52, 0);
    this.leftLegPivot.position.set(-0.32 - e * 0.28, -e * 0.38, 0);
    this.rightLegPivot.position.set(0.32 + e * 0.28, -e * 0.38, 0);

    // Determine effective animation pose
    let activePose = config.animation;
    if (config.isPlayMode) {
      if (jumpHeight > 0.05) {
        activePose = 'lompat_hore';
      } else if (isMovingInPlayMode) {
        activePose = isRunningInPlayMode ? 'run' : 'walk';
      } else if (activePose === 'walk' || activePose === 'run') {
        activePose = 'idle';
      }
    }

    // Target joint rotations
    let leftArmRx = 0;
    let leftArmRz = 0.05;
    let rightArmRx = 0;
    let rightArmRz = -0.05;
    let leftLegRx = 0;
    let rightLegRx = 0;
    let torsoRy = 0;
    let torsoRx = 0;
    let headRx = 0;
    let headRy = 0;
    let hipsBob = 0;

    if (activePose === 'idle') {
      hipsBob = Math.sin(elapsed * 2.4) * 0.025;
      leftArmRx = Math.sin(elapsed * 2.4) * 0.06;
      rightArmRx = -Math.sin(elapsed * 2.4) * 0.06;
      headRy = Math.sin(elapsed * 1.1) * 0.12;
      headRx = Math.cos(elapsed * 1.6) * 0.04;
    } else if (activePose === 'walk') {
      const wSpeed = 7.5;
      hipsBob = Math.abs(Math.sin(elapsed * wSpeed)) * 0.06;
      leftArmRx = Math.sin(elapsed * wSpeed) * 0.65;
      rightArmRx = -Math.sin(elapsed * wSpeed) * 0.65;
      leftLegRx = -Math.sin(elapsed * wSpeed) * 0.65;
      rightLegRx = Math.sin(elapsed * wSpeed) * 0.65;
      torsoRy = Math.sin(elapsed * wSpeed) * 0.08;
    } else if (activePose === 'run') {
      const rSpeed = 12.5;
      hipsBob = Math.abs(Math.sin(elapsed * rSpeed)) * 0.11;
      leftArmRx = Math.sin(elapsed * rSpeed) * 1.15;
      rightArmRx = -Math.sin(elapsed * rSpeed) * 1.15;
      leftLegRx = -Math.sin(elapsed * rSpeed) * 1.05;
      rightLegRx = Math.sin(elapsed * rSpeed) * 1.05;
      torsoRx = 0.16;
      torsoRy = Math.sin(elapsed * rSpeed) * 0.14;
    } else if (activePose === 'hormat_bendera') {
      // Crisp Indonesian Upacara Senin Flag Salute!
      rightArmRx = -2.35;
      rightArmRz = 0.42;
      leftArmRx = 0;
      leftArmRz = 0.03;
      headRx = -0.08;
      hipsBob = Math.sin(elapsed * 2.0) * 0.01;
    } else if (activePose === 'senam_pagi') {
      // Senam Kesegaran Jasmani (SKJ) Anak SD
      const sSpeed = 5.5;
      const phase = Math.sin(elapsed * sSpeed);
      hipsBob = Math.abs(phase) * 0.09;
      leftArmRz = 0.85 + phase * 0.75;
      rightArmRz = -0.85 - phase * 0.75;
      leftArmRx = -0.2;
      rightArmRx = -0.2;
      leftLegRx = phase * 0.35;
      rightLegRx = -phase * 0.35;
      headRy = Math.cos(elapsed * sSpeed * 0.5) * 0.2;
    } else if (activePose === 'lompat_hore') {
      const jumpWave = config.isPlayMode ? 0 : Math.abs(Math.sin(elapsed * 5.2)) * 0.42;
      hipsBob = jumpWave;
      leftArmRx = -2.75 + Math.sin(elapsed * 10) * 0.18;
      rightArmRx = -2.75 - Math.sin(elapsed * 10) * 0.18;
      leftArmRz = 0.25;
      rightArmRz = -0.25;
      leftLegRx = -0.28;
      rightLegRx = 0.22;
    } else if (activePose === 'baca_buku') {
      rightArmRx = -1.15;
      rightArmRz = 0.22;
      leftArmRx = -0.95;
      leftArmRz = -0.22;
      headRx = 0.28;
      headRy = Math.sin(elapsed * 1.8) * 0.08;
      hipsBob = Math.sin(elapsed * 2.0) * 0.015;
    }

    if (this.isHoldingBasketball && this.basketThrowTimer <= 0) {
      leftArmRx = -1.35;
      rightArmRx = -1.35;
      leftArmRz = -0.22;
      rightArmRz = 0.22;
      headRx = -0.22;
    }

    if (this.basketThrowTimer > 0) {
      this.basketThrowTimer = Math.max(0, this.basketThrowTimer - delta);
      const throwPhase = 1 - this.basketThrowTimer / 0.52;
      if (throwPhase < 0.25) {
        // Crouch & load shot
        hipsBob = -0.14;
        leftArmRx = -1.65;
        rightArmRx = -1.65;
        headRx = -0.28;
      } else {
        // Jump-shot release follow-through towards high hoop
        hipsBob = Math.sin(((throwPhase - 0.25) / 0.75) * Math.PI) * 0.32;
        leftArmRx = -2.55;
        rightArmRx = -2.55;
        leftArmRz = -0.1;
        rightArmRz = 0.1;
        headRx = -0.32;
      }
    }

    if (this.kickTimer > 0) {
      this.kickTimer = Math.max(0, this.kickTimer - delta);
      const kickPhase = 1 - this.kickTimer / 0.45;
      if (kickPhase < 0.28) {
        // Wind-up backswing
        rightLegRx = 0.75;
        leftArmRx = 0.45;
        rightArmRx = -0.55;
      } else {
        // Powerful forward soccer kick follow-through
        rightLegRx = -1.38;
        leftLegRx = 0.18;
        leftArmRx = -0.95;
        rightArmRx = 0.65;
        torsoRx = -0.16;
      }
    }

    if (this.pickupTimer > 0) {
      this.pickupTimer = Math.max(0, this.pickupTimer - delta);
      const bend = Math.sin((1 - this.pickupTimer / 0.42) * Math.PI);
      hipsBob = -0.32 * bend;
      torsoRx = 0.55 * bend;
      rightArmRx = -1.25 * bend;
      leftArmRx = -0.65 * bend;
      headRx = 0.35 * bend;
    }

    if (this.fallTimer > 0) {
      this.fallTimer = Math.max(0, this.fallTimer - delta);
      const fallPhase = 1 - this.fallTimer / this.fallDuration;
      if (fallPhase < 0.25) {
        // Phase 1: Trip & pitch forward dramatically
        const p = fallPhase / 0.25;
        torsoRx = 0.95 * p;
        headRx = -0.35 * p;
        leftArmRx = -2.1 * p;
        rightArmRx = -2.1 * p;
        leftArmRz = 0.35 * p;
        rightArmRz = -0.35 * p;
        leftLegRx = 0.5 * p;
        rightLegRx = -0.3 * p;
        hipsBob = -0.65 * p;
      } else if (fallPhase < 0.72) {
        // Phase 2: Prone faceplant slide on the track
        torsoRx = 1.4;
        headRx = -0.5;
        leftArmRx = -2.6;
        rightArmRx = -2.6;
        leftArmRz = 0.45;
        rightArmRz = -0.45;
        leftLegRx = 0.25;
        rightLegRx = 0.2;
        hipsBob = -0.92;
      } else {
        // Phase 3: Push up, stand back up onto feet
        const p = (fallPhase - 0.72) / 0.28;
        torsoRx = 1.4 * (1 - p);
        headRx = -0.5 * (1 - p);
        leftArmRx = -2.6 * (1 - p) + p * -0.4;
        rightArmRx = -2.6 * (1 - p) + p * -0.4;
        leftArmRz = 0.45 * (1 - p);
        rightArmRz = -0.45 * (1 - p);
        leftLegRx = 0.25 * (1 - p);
        rightLegRx = 0.2 * (1 - p);
        hipsBob = -0.92 * (1 - p);
      }
    }

    // Smoothly damp joint rotations
    const k =
      this.fallTimer > 0 || this.kickTimer > 0 || this.basketThrowTimer > 0 || this.pickupTimer > 0 ? 22 : 12;
    this.hips.position.y = THREE.MathUtils.damp(
      this.hips.position.y,
      1.22 + hipsBob + jumpHeight,
      k,
      delta
    );
    this.torso.rotation.x = THREE.MathUtils.damp(this.torso.rotation.x, torsoRx, k, delta);
    this.torso.rotation.y = THREE.MathUtils.damp(this.torso.rotation.y, torsoRy, k, delta);
    this.headPivot.rotation.x = THREE.MathUtils.damp(this.headPivot.rotation.x, headRx, k, delta);
    this.headPivot.rotation.y = THREE.MathUtils.damp(this.headPivot.rotation.y, headRy, k, delta);

    this.leftArmPivot.rotation.x = THREE.MathUtils.damp(
      this.leftArmPivot.rotation.x,
      leftArmRx,
      k,
      delta
    );
    this.leftArmPivot.rotation.z = THREE.MathUtils.damp(
      this.leftArmPivot.rotation.z,
      leftArmRz,
      k,
      delta
    );
    this.rightArmPivot.rotation.x = THREE.MathUtils.damp(
      this.rightArmPivot.rotation.x,
      rightArmRx,
      k,
      delta
    );
    this.rightArmPivot.rotation.z = THREE.MathUtils.damp(
      this.rightArmPivot.rotation.z,
      rightArmRz,
      k,
      delta
    );

    this.leftLegPivot.rotation.x = THREE.MathUtils.damp(
      this.leftLegPivot.rotation.x,
      leftLegRx,
      k,
      delta
    );
    this.rightLegPivot.rotation.x = THREE.MathUtils.damp(
      this.rightLegPivot.rotation.x,
      rightLegRx,
      k,
      delta
    );

    // Subtle natural eye blink every ~3.8 seconds
    const blinkCycle = (elapsed * 0.95) % 3.8;
    const blinkScaleY = blinkCycle > 3.66 ? 0.12 : 1.0;
    this.eyesGroup.scale.y = THREE.MathUtils.damp(this.eyesGroup.scale.y, blinkScaleY, 24, delta);
  }

  private rebuild3DFaceExpression(expression: CharacterConfig['expression']) {
    this.clearGroup(this.eyesGroup);
    this.clearGroup(this.mouthGroup);
    this.clearGroup(this.face3DGroup);

    const darkMat = new THREE.MeshBasicMaterial({ color: '#141417' });
    const shineMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const blushMat = new THREE.MeshBasicMaterial({ color: '#F87171' });
    const mouthRedMat = new THREE.MeshBasicMaterial({ color: '#991B1B' });
    const tongueMat = new THREE.MeshBasicMaterial({ color: '#FB7185' });

    // 1. Rosy Cheek Blush Pads
    [-0.19, 0.19].forEach((cx) => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.045, 0.016), blushMat);
      cheek.position.set(cx, 0.45, 0.425);
      this.face3DGroup.add(cheek);
    });

    // 2. Expressive 3D Eyebrows
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.028, 0.022), darkMat);
    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.028, 0.022), darkMat);
    const browY = expression === 'kaget' ? 0.64 : 0.615;
    leftBrow.position.set(-0.13, browY, 0.428);
    rightBrow.position.set(0.13, browY, 0.428);
    if (expression === 'semangat') {
      leftBrow.rotation.z = -0.22;
      rightBrow.rotation.z = 0.22;
    } else if (expression === 'fokus') {
      leftBrow.rotation.z = -0.1;
      rightBrow.rotation.z = 0.1;
    } else if (expression === 'kaget') {
      leftBrow.rotation.z = 0.16;
      rightBrow.rotation.z = -0.16;
    } else {
      leftBrow.rotation.z = 0.06;
      rightBrow.rotation.z = -0.06;
    }
    this.face3DGroup.add(leftBrow, rightBrow);

    // 3. 3D Pill Eyes + Crisp White Catchlights inside eyesGroup (centered at y = 0.54)
    this.eyesGroup.position.set(0, 0.54, 0.428);
    const eyeH = expression === 'fokus' ? 0.072 : 0.088;
    [-0.125, 0.125].forEach((ex) => {
      const eyeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.062, eyeH, 0.022), darkMat);
      eyeMesh.position.set(ex, 0, 0);
      const shineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.024, 0.026), shineMat);
      shineMesh.position.set(ex - 0.012, 0.016, 0.003);
      this.eyesGroup.add(eyeMesh, shineMesh);
    });
    this.face3DGroup.add(this.eyesGroup);

    // 4. Optional 3D Eyeglasses Frame when expression === 'kacamata'
    if (expression === 'kacamata') {
      const frameMat = new THREE.MeshBasicMaterial({ color: '#0F172A' });
      [-0.13, 0.13].forEach((gx) => {
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.032), frameMat);
        topBar.position.set(gx, 0.59, 0.436);
        const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.032), frameMat);
        botBar.position.set(gx, 0.49, 0.436);
        const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.032), frameMat);
        leftRim.position.set(gx - 0.068, 0.54, 0.436);
        const rightRim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.032), frameMat);
        rightRim.position.set(gx + 0.068, 0.54, 0.436);
        this.face3DGroup.add(topBar, botBar, leftRim, rightRim);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.022, 0.032), frameMat);
      bridge.position.set(0, 0.55, 0.436);
      this.face3DGroup.add(bridge);
    }

    // 5. Expressive 3D Mouth inside mouthGroup (centered at y = 0.40)
    this.mouthGroup.position.set(0, 0.40, 0.428);
    if (expression === 'ceria' || expression === 'kacamata') {
      const mouthBg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.075, 0.02), mouthRedMat);
      const teethBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.024), shineMat);
      teethBar.position.set(0, 0.022, 0.002);
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.024, 0.024), tongueMat);
      tongue.position.set(0, -0.02, 0.002);
      this.mouthGroup.add(mouthBg, teethBar, tongue);
    } else if (expression === 'semangat') {
      const grinBorder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.068, 0.02), darkMat);
      const grinTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.046, 0.024), shineMat);
      grinTeeth.position.set(0, 0, 0.002);
      this.mouthGroup.add(grinBorder, grinTeeth);
    } else if (expression === 'kaget') {
      const oOuter = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.02), darkMat);
      const oInner = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.068, 0.024), mouthRedMat);
      oInner.position.set(0, 0, 0.002);
      this.mouthGroup.add(oOuter, oInner);
    } else {
      // 'fokus' confident slight smile
      const smileCenter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 0.022), darkMat);
      const smileCornerR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.024, 0.022), darkMat);
      smileCornerR.position.set(0.068, 0.012, 0);
      smileCornerR.rotation.z = 0.35;
      this.mouthGroup.add(smileCenter, smileCornerR);
    }
    this.face3DGroup.add(this.mouthGroup);
  }

  private kickTimer = 0;
  private basketThrowTimer = 0;
  private pickupTimer = 0;
  private isHoldingBasketball = false;
  private fallTimer = 0;
  private fallDuration = 1.0;

  public triggerKickAnimation() {
    this.kickTimer = 0.45;
  }

  public setHoldingBasketballPose(holding: boolean) {
    this.isHoldingBasketball = holding;
  }

  public triggerBasketThrowAnimation() {
    this.basketThrowTimer = 0.52;
  }

  public triggerPickupAnimation() {
    this.pickupTimer = 0.42;
  }

  public triggerFallAnimation(duration = 1.0) {
    this.fallTimer = duration;
    this.fallDuration = duration;
  }
}
