import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RobloxSDCharacter } from '../three/RobloxSDCharacter';
import { SchoolCourtyardEnvironment } from '../three/SchoolCourtyardScene';
import {
  ActiveNPCDialogue,
  CleanupMissionStage,
  getObstacleTrackPoint,
  PenaltyKickResult,
  PenaltyZoneId,
  PJOKMissionMode,
  SchoolPopulationManager,
  SchoolTrashItemInfo,
  TrashCategoryId,
  TrashSortResult,
} from '../three/SchoolPopulationNPCs';
import { SoftwareCanvas3DRenderer } from '../three/SoftwareCanvas3DRenderer';
import {
  CameraPresetId,
  CharacterConfig,
  SCHOOL_LOCATIONS,
  SchoolLocationInfo,
} from '../types/character';
import { soundFX } from '../utils/soundFX';

import { MobileInputState } from './MobileTouchControls';
import { CeremonyCameraView } from './OpeningCeremonyHUD';

export interface PenaltyViewportController {
  executeKick: (
    zone: PenaltyZoneId,
    power: number,
    missionType?: PJOKMissionMode
  ) => PenaltyKickResult | null;
  resetBall: () => void;
  executeTrashSort: (
    item: SchoolTrashItemInfo,
    chosenBin: TrashCategoryId
  ) => TrashSortResult | null;
  manualPickupTrash: (itemId: string) => SchoolTrashItemInfo | null;
  getNearestTrash: () => SchoolTrashItemInfo | null;
  syncMathChalkboard: (
    title: string,
    equation: string,
    subtext: string,
    isCorrect: boolean | null,
    teacherComment?: string
  ) => void;
  executeDampuGacoThrow: (
    targetSquareId: number,
    isGoodThrow: boolean,
    comment: string
  ) => void;
  executeDampuHop: (
    worldX: number,
    worldZ: number,
    hopType: 'engklek_1' | 'dampu_2' | 'lompat_gaco' | 'start',
    comment: string,
    isSuccess: boolean
  ) => void;
  executeJumpRopeLeap: (
    isSuccess: boolean,
    jumpBoost: number,
    intanComment: string,
    ropeSpeedMultiplier: number
  ) => void;
  executeKelerengFlick: (
    targetIndex: number,
    isHit: boolean,
    isPerfect: boolean,
    comment: string
  ) => void;
  resetKelerengMarbles: () => void;
  executeCrossingSignal: (
    waveIndex: number,
    isSafe: boolean,
    isPerfect: boolean,
    comment: string
  ) => void;
  triggerEcobrickWindScatter: () => void;
  snapEcobrickPiece: (
    slotIndex: number,
    char: string,
    isPerfectUpright: boolean,
    comment: string
  ) => void;
  setCeremonyFlagProgress: (progress: number) => void;
  syncTonoComment: (comment: string, isSuccess: boolean) => void;
  syncObstacleRunProgress: (distance: number, jumpY: number, isSprinting: boolean) => void;
  knockObstacle: (obstacleId: number) => void;
  resetObstacles?: () => void;
  syncPakBudiCoach: (comment: string, isSuccess: boolean) => void;
  triggerFallAnimation?: (duration?: number) => void;
}

interface CharacterViewport3DProps {
  config: CharacterConfig;
  chatTriggerNonce?: number;
  customSpeechText?: string;
  openingCeremonyActive?: boolean;
  ceremonyCameraView?: CeremonyCameraView;
  penaltyMinigameActive?: boolean;
  pjokMissionType?: PJOKMissionMode;
  penaltyAimZone?: PenaltyZoneId;
  cleanupMissionStage?: CleanupMissionStage;
  collectedTrashIds?: string[];
  mathMinigameActive?: boolean;
  dampuMinigameActive?: boolean;
  jumpRopeMinigameActive?: boolean;
  kelerengMinigameActive?: boolean;
  crossingMinigameActive?: boolean;
  ecobrickMinigameActive?: boolean;
  tonoMinigameActive?: boolean;
  obstacleRunActive?: boolean;
  onTrashPickedUp?: (item: SchoolTrashItemInfo) => void;
  onRegisterPenaltyController?: (ctrl: PenaltyViewportController) => void;
  mobileInputRef?: React.MutableRefObject<MobileInputState>;
  onUpdatePlayerCoords?: (x: number, z: number, nearestZone: SchoolLocationInfo) => void;
  onUpdateActiveDialogue?: (dialogue: ActiveNPCDialogue | null) => void;
}

const CAMERA_PRESET_OFFSETS: Record<
  CameraPresetId,
  { offset: [number, number, number]; lookOffset: [number, number, number] }
> = {
  front: { offset: [0, 2.2, 5.4], lookOffset: [0, 1.85, 0] },
  three_quarter: { offset: [3.2, 2.8, 5.8], lookOffset: [0, 1.9, 0] },
  portrait: { offset: [0.4, 2.55, 2.45], lookOffset: [0, 2.42, 0] },
  back_bag: { offset: [-2.2, 2.2, -4.4], lookOffset: [0, 1.85, 0] },
  playground: { offset: [0, 6.8, 13.5], lookOffset: [0, 2.4, -2.0] },
  aerial_map: { offset: [0, 72, 96], lookOffset: [0, 0, 8] },
};

// Reusable module-scope math vectors (Zero GC in render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalLook = new THREE.Vector3();
const _moveVec = new THREE.Vector3();

function getFloorElevation(x: number, z: number): number {
  if (z < -34.5 || (z <= 56.8 && (x < -36.5 || x > 36.5))) {
    return 0.45;
  }
  return 0;
}

function findNearestLocation(x: number, z: number): SchoolLocationInfo {
  let best = SCHOOL_LOCATIONS[0];
  let bestDistSq = Infinity;
  for (const loc of SCHOOL_LOCATIONS) {
    const dx = x - loc.spawnPos[0];
    const dz = z - loc.spawnPos[1];
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = loc;
    }
  }
  return best;
}

export const CharacterViewport3D: React.FC<CharacterViewport3DProps> = ({
  config,
  chatTriggerNonce = 0,
  customSpeechText = '',
  openingCeremonyActive = false,
  ceremonyCameraView = 'panoramic',
  penaltyMinigameActive = false,
  pjokMissionType = 'penalty',
  penaltyAimZone = 'kiri_atas',
  cleanupMissionStage = 'inactive',
  collectedTrashIds = [],
  mathMinigameActive = false,
  dampuMinigameActive = false,
  jumpRopeMinigameActive = false,
  kelerengMinigameActive = false,
  crossingMinigameActive = false,
  ecobrickMinigameActive = false,
  tonoMinigameActive = false,
  obstacleRunActive = false,
  onTrashPickedUp,
  onRegisterPenaltyController,
  mobileInputRef,
  onUpdatePlayerCoords,
  onUpdateActiveDialogue,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<CharacterConfig>(config);
  const ceremonyActiveRef = useRef<boolean>(openingCeremonyActive);
  const ceremonyCameraViewRef = useRef<CeremonyCameraView>(ceremonyCameraView);
  const penaltyActiveRef = useRef<boolean>(penaltyMinigameActive);
  const pjokMissionTypeRef = useRef<PJOKMissionMode>(pjokMissionType);
  const cleanupStageRef = useRef<CleanupMissionStage>(cleanupMissionStage);
  const mathActiveRef = useRef<boolean>(mathMinigameActive);
  const dampuActiveRef = useRef<boolean>(dampuMinigameActive);
  const jumpRopeActiveRef = useRef<boolean>(jumpRopeMinigameActive);
  const kelerengActiveRef = useRef<boolean>(kelerengMinigameActive);
  const crossingActiveRef = useRef<boolean>(crossingMinigameActive);
  const ecobrickActiveRef = useRef<boolean>(ecobrickMinigameActive);
  const tonoActiveRef = useRef<boolean>(tonoMinigameActive);
  const obstacleRunActiveRef = useRef<boolean>(obstacleRunActive);
  const jumpRopeBoostRef = useRef<number>(0);
  const dampuPlayerTargetRef = useRef<{ x: number; z: number; hopArc: number }>({
    x: 1.5,
    z: 24.3,
    hopArc: 0,
  });
  const onTrashPickedUpRef = useRef(onTrashPickedUp);
  const onUpdatePlayerCoordsRef = useRef(onUpdatePlayerCoords);
  const onUpdateActiveDialogueRef = useRef(onUpdateActiveDialogue);
  const characterRef = useRef<RobloxSDCharacter | null>(null);
  const envRef = useRef<SchoolCourtyardEnvironment | null>(null);
  const populationRef = useRef<SchoolPopulationManager | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraTransitionActiveRef = useRef<boolean>(true);
  const lastLocationNonceRef = useRef<number>(config.locationTriggerNonce);
  const lastDialogueKeyRef = useRef<string>('');
  const clockRef = useRef<THREE.Clock | null>(null);

  useEffect(() => {
    onUpdatePlayerCoordsRef.current = onUpdatePlayerCoords;
  }, [onUpdatePlayerCoords]);

  useEffect(() => {
    onUpdateActiveDialogueRef.current = onUpdateActiveDialogue;
  }, [onUpdateActiveDialogue]);

  useEffect(() => {
    onTrashPickedUpRef.current = onTrashPickedUp;
  }, [onTrashPickedUp]);

  useEffect(() => {
    const prevStage = cleanupStageRef.current;
    cleanupStageRef.current = cleanupMissionStage;
    if (populationRef.current) {
      populationRef.current.setCleanupMissionState(
        cleanupMissionStage,
        collectedTrashIds,
        (item) => {
          if (onTrashPickedUpRef.current) {
            onTrashPickedUpRef.current(item);
          }
        }
      );
    }
    if (cleanupMissionStage === 'inactive' && prevStage !== 'inactive') {
      cameraTransitionActiveRef.current = true;
    } else if (
      cleanupMissionStage === 'collecting' &&
      prevStage === 'inactive' &&
      characterRef.current &&
      envRef.current
    ) {
      // Spawn player in front of the 4 Sorting Bins & Principal Hendra if currently indoors
      if (characterRef.current.root.position.z < -30) {
        characterRef.current.root.position.set(0, 0, 22.8);
        characterRef.current.root.rotation.y = Math.PI;
        envRef.current.contactShadowMesh.position.set(0, 0.02, 22.8);
      }
      cameraTransitionActiveRef.current = true;
      if (onUpdatePlayerCoordsRef.current) {
        const px = characterRef.current.root.position.x;
        const pz = characterRef.current.root.position.z;
        onUpdatePlayerCoordsRef.current(px, pz, findNearestLocation(px, pz));
      }
    } else if (cleanupMissionStage === 'collecting' && prevStage === 'sorting') {
      cameraTransitionActiveRef.current = true;
    }
  }, [cleanupMissionStage, collectedTrashIds]);

  useEffect(() => {
    const wasActive = penaltyActiveRef.current;
    penaltyActiveRef.current = penaltyMinigameActive;
    pjokMissionTypeRef.current = pjokMissionType;
    if (populationRef.current) {
      populationRef.current.setPenaltyMinigameMode(
        penaltyMinigameActive,
        penaltyAimZone,
        pjokMissionType
      );
    }
    if (characterRef.current) {
      characterRef.current.setHoldingBasketballPose(
        penaltyMinigameActive && pjokMissionType === 'basket'
      );
    }
    if (!penaltyMinigameActive && wasActive) {
      cameraTransitionActiveRef.current = true;
    }
  }, [penaltyMinigameActive, penaltyAimZone, pjokMissionType]);

  useEffect(() => {
    const wasMath = mathActiveRef.current;
    mathActiveRef.current = mathMinigameActive;
    if (populationRef.current) {
      populationRef.current.setMathMissionMode(mathMinigameActive);
    }
    if (!mathMinigameActive && wasMath) {
      cameraTransitionActiveRef.current = true;
    }
  }, [mathMinigameActive]);

  useEffect(() => {
    const wasDampu = dampuActiveRef.current;
    dampuActiveRef.current = dampuMinigameActive;
    if (populationRef.current) {
      populationRef.current.setDampuMissionMode(dampuMinigameActive);
    }
    if (dampuMinigameActive) {
      // Start at North line (1.5, 24.3) facing South (+Z, rotation.y = 0)
      dampuPlayerTargetRef.current = { x: 1.5, z: 24.3, hopArc: 0 };
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(1.5, 0, 24.3);
        characterRef.current.root.rotation.y = 0;
        envRef.current.contactShadowMesh.position.set(1.5, 0.02, 24.3);
      }
    } else if (wasDampu) {
      cameraTransitionActiveRef.current = true;
    }
  }, [dampuMinigameActive]);

  useEffect(() => {
    const wasJumpRope = jumpRopeActiveRef.current;
    jumpRopeActiveRef.current = jumpRopeMinigameActive;
    if (populationRef.current) {
      populationRef.current.setJumpRopeMissionMode(jumpRopeMinigameActive);
    }
    if (jumpRopeMinigameActive) {
      jumpRopeBoostRef.current = 0;
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(-12.5, 0, 29.5);
        characterRef.current.root.rotation.y = 0;
        envRef.current.contactShadowMesh.position.set(-12.5, 0.02, 29.5);
      }
    } else if (wasJumpRope) {
      cameraTransitionActiveRef.current = true;
    }
  }, [jumpRopeMinigameActive]);

  useEffect(() => {
    const wasKelereng = kelerengActiveRef.current;
    kelerengActiveRef.current = kelerengMinigameActive;
    if (populationRef.current) {
      populationRef.current.setKelerengMissionMode(kelerengMinigameActive);
    }
    if (kelerengMinigameActive) {
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(14.5, 0, 32.1);
        characterRef.current.root.rotation.y = Math.PI;
        envRef.current.contactShadowMesh.position.set(14.5, 0.02, 32.1);
      }
    } else if (wasKelereng) {
      cameraTransitionActiveRef.current = true;
    }
  }, [kelerengMinigameActive]);

  useEffect(() => {
    const wasCrossing = crossingActiveRef.current;
    crossingActiveRef.current = crossingMinigameActive;
    if (populationRef.current) {
      populationRef.current.setCrossingMissionMode(crossingMinigameActive);
    }
    if (crossingMinigameActive) {
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(-4.4, 0, 63.6);
        characterRef.current.root.rotation.y = 0;
        envRef.current.contactShadowMesh.position.set(-4.4, 0.02, 63.6);
      }
    } else if (wasCrossing) {
      cameraTransitionActiveRef.current = true;
    }
  }, [crossingMinigameActive]);

  useEffect(() => {
    const wasEcobrick = ecobrickActiveRef.current;
    ecobrickActiveRef.current = ecobrickMinigameActive;
    if (populationRef.current) {
      populationRef.current.setEcobrickMissionMode(ecobrickMinigameActive);
    }
    if (ecobrickMinigameActive) {
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(11.8, 0, 50.2);
        characterRef.current.root.rotation.y = 0.35;
        envRef.current.contactShadowMesh.position.set(11.8, 0.02, 50.2);
      }
    } else if (wasEcobrick) {
      if (envRef.current) {
        envRef.current.restoreAllEcobrickPieces();
      }
      if (populationRef.current) {
        populationRef.current.setEcobrickScatteredState(false);
      }
      cameraTransitionActiveRef.current = true;
    }
  }, [ecobrickMinigameActive]);

  useEffect(() => {
    const wasTono = tonoActiveRef.current;
    tonoActiveRef.current = tonoMinigameActive;
    if (populationRef.current) {
      populationRef.current.setTonoMissionMode(tonoMinigameActive);
    }
    if (tonoMinigameActive) {
      if (characterRef.current && envRef.current) {
        // Position student beside Tono (12.8, 0, 61.5) facing South (+Z, 0) toward food carts
        characterRef.current.root.position.set(12.8, 0, 61.5);
        characterRef.current.root.rotation.y = 0;
        envRef.current.contactShadowMesh.position.set(12.8, 0.02, 61.5);
      }
    } else if (wasTono) {
      cameraTransitionActiveRef.current = true;
    }
  }, [tonoMinigameActive]);

  useEffect(() => {
    const wasObstacleRun = obstacleRunActiveRef.current;
    obstacleRunActiveRef.current = obstacleRunActive;
    if (populationRef.current) {
      populationRef.current.setObstacleCourseActive(obstacleRunActive);
    }
    if (obstacleRunActive) {
      if (characterRef.current && envRef.current) {
        // Position student at Start Line (-14.0, 0, 22.0) facing East (+X, Math.PI / 2)
        characterRef.current.root.position.set(-14.0, 0, 22.0);
        characterRef.current.root.rotation.y = Math.PI / 2;
        envRef.current.contactShadowMesh.position.set(-14.0, 0.02, 22.0);
      }
    } else if (wasObstacleRun) {
      cameraTransitionActiveRef.current = true;
    }
  }, [obstacleRunActive]);

  useEffect(() => {
    ceremonyCameraViewRef.current = ceremonyCameraView;
  }, [ceremonyCameraView]);

  useEffect(() => {
    const wasCeremony = ceremonyActiveRef.current;
    ceremonyActiveRef.current = openingCeremonyActive;
    if (populationRef.current) {
      populationRef.current.setOpeningCeremonyMode(openingCeremonyActive, openingCeremonyActive);
    }
    if (envRef.current) {
      envRef.current.setCeremonyFlagState(openingCeremonyActive, openingCeremonyActive ? 0 : 1);
    }
    if (openingCeremonyActive) {
      if (characterRef.current && envRef.current) {
        characterRef.current.root.position.set(0.0, 0, -13.6);
        characterRef.current.root.rotation.y = Math.PI;
        envRef.current.contactShadowMesh.position.set(0.0, 0.02, -13.6);
      }
    } else if (wasCeremony) {
      cameraTransitionActiveRef.current = true;
    }
  }, [openingCeremonyActive]);

  useEffect(() => {
    if (!onRegisterPenaltyController) return;
    onRegisterPenaltyController({
      executeKick: (
        zone: PenaltyZoneId,
        power: number,
        missionType: PJOKMissionMode = pjokMissionTypeRef.current
      ) => {
        if (!populationRef.current) return null;
        if (missionType === 'basket') {
          if (characterRef.current) {
            characterRef.current.triggerBasketThrowAnimation();
          }
          return populationRef.current.executeBasketballThrow(
            zone,
            power,
            configRef.current.soundEnabled
          );
        }
        if (characterRef.current) {
          characterRef.current.triggerKickAnimation();
        }
        return populationRef.current.executePenaltyKick(
          zone,
          power,
          configRef.current.soundEnabled
        );
      },
      resetBall: () => {
        if (populationRef.current) {
          populationRef.current.resetPenaltyBallToSpot();
        }
      },
      executeTrashSort: (item: SchoolTrashItemInfo, chosenBin: TrashCategoryId) => {
        if (!populationRef.current) return null;
        if (characterRef.current) {
          characterRef.current.triggerBasketThrowAnimation();
        }
        return populationRef.current.executeTrashSortThrow(
          item,
          chosenBin,
          configRef.current.soundEnabled
        );
      },
      manualPickupTrash: (itemId: string) => {
        if (!populationRef.current || !characterRef.current) return null;
        const picked = populationRef.current.manualPickupTrashById(
          itemId,
          configRef.current.soundEnabled
        );
        if (picked) {
          const dx = picked.pos[0] - characterRef.current.root.position.x;
          const dz = picked.pos[1] - characterRef.current.root.position.z;
          if (Math.hypot(dx, dz) > 0.05) {
            characterRef.current.root.rotation.y = Math.atan2(dx, dz);
          }
          characterRef.current.triggerPickupAnimation();
        }
        return picked;
      },
      getNearestTrash: () => {
        if (!populationRef.current || !characterRef.current) return null;
        return populationRef.current.getNearestUncollectedTrash(
          characterRef.current.root.position.x,
          characterRef.current.root.position.z
        );
      },
      syncMathChalkboard: (
        title: string,
        equation: string,
        subtext: string,
        isCorrect: boolean | null,
        teacherComment?: string
      ) => {
        if (!populationRef.current) return;
        if (isCorrect === true && characterRef.current) {
          characterRef.current.triggerBasketThrowAnimation();
        }
        populationRef.current.syncMathChalkboard(
          title,
          equation,
          subtext,
          isCorrect,
          teacherComment
        );
      },
      executeDampuGacoThrow: (
        targetSquareId: number,
        isGoodThrow: boolean,
        comment: string
      ) => {
        if (!populationRef.current) return;
        if (characterRef.current) {
          characterRef.current.triggerBasketThrowAnimation();
        }
        populationRef.current.executeDampuGacoThrow(
          targetSquareId,
          isGoodThrow,
          comment,
          configRef.current.soundEnabled
        );
      },
      executeDampuHop: (
        worldX: number,
        worldZ: number,
        hopType: 'engklek_1' | 'dampu_2' | 'lompat_gaco' | 'start',
        comment: string,
        isSuccess: boolean
      ) => {
        dampuPlayerTargetRef.current = {
          x: worldX,
          z: worldZ,
          hopArc: hopType === 'start' ? 0 : hopType === 'lompat_gaco' ? 1.15 : 0.78,
        };
        if (populationRef.current && comment) {
          populationRef.current.syncDampuHopComment(
            comment,
            isSuccess,
            configRef.current.soundEnabled
          );
        }
      },
      executeJumpRopeLeap: (
        isSuccess: boolean,
        jumpBoost: number,
        intanComment: string,
        ropeSpeedMultiplier: number
      ) => {
        jumpRopeBoostRef.current = isSuccess ? Math.max(0.85, jumpBoost) : 0.32;
        if (populationRef.current) {
          populationRef.current.syncJumpRopeComment(
            intanComment,
            isSuccess,
            ropeSpeedMultiplier,
            configRef.current.soundEnabled
          );
        }
      },
      executeKelerengFlick: (
        targetIndex: number,
        isHit: boolean,
        isPerfect: boolean,
        comment: string
      ) => {
        if (characterRef.current) {
          characterRef.current.triggerBasketThrowAnimation();
        }
        if (populationRef.current) {
          populationRef.current.executeKelerengFlick(
            targetIndex,
            isHit,
            isPerfect,
            comment,
            configRef.current.soundEnabled
          );
        }
      },
      resetKelerengMarbles: () => {
        if (populationRef.current) {
          populationRef.current.resetKelerengMarbles();
        }
      },
      executeCrossingSignal: (
        waveIndex: number,
        isSafe: boolean,
        isPerfect: boolean,
        comment: string
      ) => {
        if (characterRef.current) {
          characterRef.current.triggerBasketThrowAnimation();
        }
        if (populationRef.current) {
          populationRef.current.executeCrossingSignal(
            waveIndex,
            isSafe,
            isPerfect,
            comment,
            configRef.current.soundEnabled
          );
        }
      },
      triggerEcobrickWindScatter: () => {
        if (envRef.current) {
          envRef.current.triggerEcobrickWindScatter(configRef.current.soundEnabled);
        }
        if (populationRef.current) {
          populationRef.current.setEcobrickScatteredState(true);
        }
      },
      snapEcobrickPiece: (
        slotIndex: number,
        _char: string,
        isPerfectUpright: boolean,
        comment: string
      ) => {
        if (slotIndex >= 0) {
          if (characterRef.current) {
            characterRef.current.triggerBasketThrowAnimation();
          }
          if (envRef.current) {
            envRef.current.snapEcobrickPiece(
              slotIndex,
              isPerfectUpright,
              configRef.current.soundEnabled
            );
          }
        }
        if (populationRef.current) {
          populationRef.current.syncEcobrickComment(
            comment,
            slotIndex >= 0,
            configRef.current.soundEnabled
          );
        }
      },
      setCeremonyFlagProgress: (progress: number) => {
        if (envRef.current) {
          envRef.current.setCeremonyFlagState(ceremonyActiveRef.current, progress);
        }
        if (populationRef.current) {
          populationRef.current.setCeremonyFlagProgress(progress);
        }
      },
      syncTonoComment: (comment: string, isSuccess: boolean) => {
        if (populationRef.current) {
          populationRef.current.syncTonoComment(
            comment,
            isSuccess,
            configRef.current.soundEnabled
          );
        }
      },
      syncObstacleRunProgress: (distance: number, jumpY: number, _isSprinting: boolean) => {
        if (!characterRef.current) return;
        const pt = getObstacleTrackPoint(distance);
        characterRef.current.root.position.set(pt.x, jumpY, pt.z);
        characterRef.current.root.rotation.y = pt.angle;
        if (envRef.current) {
          envRef.current.contactShadowMesh.position.set(pt.x, 0.02, pt.z);
        }
      },
      knockObstacle: (obstacleId: number) => {
        if (populationRef.current) {
          populationRef.current.knockObstacle(obstacleId);
        }
      },
      resetObstacles: () => {
        if (populationRef.current) {
          populationRef.current.resetObstacles();
        }
      },
      syncPakBudiCoach: (comment: string, isSuccess: boolean) => {
        if (populationRef.current) {
          populationRef.current.syncPakBudiCoach(
            comment,
            isSuccess,
            configRef.current.soundEnabled
          );
        }
      },
      triggerFallAnimation: (duration = 1.0) => {
        if (characterRef.current) {
          characterRef.current.triggerFallAnimation(duration);
        }
      },
    });
  }, [onRegisterPenaltyController]);

  // Trigger manual speech when chatTriggerNonce increments
  useEffect(() => {
    if (chatTriggerNonce > 0 && populationRef.current && characterRef.current) {
      const px = characterRef.current.root.position.x;
      const pz = characterRef.current.root.position.z;
      const elapsed = clockRef.current ? clockRef.current.getElapsedTime() : 0;
      const updated = populationRef.current.triggerRandomChatForNearest(
        px,
        pz,
        elapsed,
        configRef.current.soundEnabled,
        configRef.current.studentName,
        configRef.current.genderStyle,
        customSpeechText
      );
      if (updated && onUpdateActiveDialogueRef.current) {
        const volBucket = Math.round(updated.voiceVolume * 50);
        lastDialogueKeyRef.current = `${updated.npcName}:${updated.npcActivity}:${updated.message}:${volBucket}:${updated.playerReply || ''}`;
        onUpdateActiveDialogueRef.current(updated);
      }
    }
  }, [chatTriggerNonce, customSpeechText]);

  // Keep configRef synced and apply material/mesh updates without tearing down renderer
  useEffect(() => {
    const prev = configRef.current;
    configRef.current = config;

    if (characterRef.current) {
      characterRef.current.applyConfig(config);
    }
    if (
      envRef.current &&
      sceneRef.current &&
      (prev.timeOfDay !== config.timeOfDay || prev.weather !== config.weather)
    ) {
      envRef.current.applyTimeOfDay(sceneRef.current, config.timeOfDay, config.weather);
    }
    if (prev.cameraPreset !== config.cameraPreset) {
      cameraTransitionActiveRef.current = true;
    }

    // Handle Teleport to Selected School Facility or Room Interior
    if (
      lastLocationNonceRef.current !== config.locationTriggerNonce &&
      characterRef.current &&
      envRef.current
    ) {
      lastLocationNonceRef.current = config.locationTriggerNonce;
      const targetLoc =
        SCHOOL_LOCATIONS.find((l) => l.id === config.activeLocation) || SCHOOL_LOCATIONS[0];
      const [tx, tz] = targetLoc.spawnPos;
      const floorY = getFloorElevation(tx, tz);

      characterRef.current.root.position.set(tx, floorY, tz);
      characterRef.current.root.rotation.y = targetLoc.facingAngle;
      envRef.current.contactShadowMesh.position.set(tx, floorY + 0.02, tz);
      cameraTransitionActiveRef.current = true;

      if (populationRef.current) {
        populationRef.current.preloadNearbyDialogues(tx, tz);
      }
      if (onUpdatePlayerCoordsRef.current) {
        onUpdatePlayerCoordsRef.current(tx, tz, targetLoc);
      }
    }
  }, [config]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Initialize high-fidelity WebGLRenderer with antialiasing, ACES tone mapping & soft shadows
    let renderer: THREE.WebGLRenderer | null = null;
    let softwareRenderer: SoftwareCanvas3DRenderer | null = null;
    let envMapTexture: THREE.Texture | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        renderer = null;
      }
    }

    if (renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      softwareRenderer = new SoftwareCanvas3DRenderer(width, height);
    }

    const activeDomElement = renderer ? renderer.domElement : softwareRenderer!.domElement;
    container.appendChild(activeDomElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (renderer) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        envMapTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
        scene.environment = envMapTexture;
        scene.environmentIntensity = 0.45;
        roomEnv.dispose();
        pmremGenerator.dispose();
      } catch {
        // Ignore if PMREM generation is unsupported
      }
    }

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 560);
    const initialPreset = CAMERA_PRESET_OFFSETS[configRef.current.cameraPreset];
    camera.position.set(...initialPreset.offset);

    const controls = new OrbitControls(camera, activeDomElement);
    controls.target.set(...initialPreset.lookOffset);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.025; // Never dip below ground
    controls.minDistance = 1.6;
    controls.maxDistance = 155;
    controls.update();

    const onControlStart = () => {
      cameraTransitionActiveRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // Allow browser to restore WebGL context automatically instead of degrading to 2D bounding boxes
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      if (renderer) {
        renderer.shadowMap.needsUpdate = true;
      }
    };
    if (renderer) {
      renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);
    }

    const maxAniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;

    // 2. Build Expansive School Campus, Animated NPC Population & Roblox SD Character
    const courtyard = new SchoolCourtyardEnvironment(scene, maxAniso);
    courtyard.applyTimeOfDay(scene, configRef.current.timeOfDay, configRef.current.weather);
    envRef.current = courtyard;

    const population = new SchoolPopulationManager(scene);
    populationRef.current = population;

    const character = new RobloxSDCharacter(configRef.current, maxAniso);
    // Spawn character at initial activeLocation
    const initLoc =
      SCHOOL_LOCATIONS.find((l) => l.id === configRef.current.activeLocation) ||
      SCHOOL_LOCATIONS[0];
    const initFloorY = getFloorElevation(initLoc.spawnPos[0], initLoc.spawnPos[1]);
    character.root.position.set(initLoc.spawnPos[0], initFloorY, initLoc.spawnPos[1]);
    character.root.rotation.y = initLoc.facingAngle;
    courtyard.contactShadowMesh.position.set(
      initLoc.spawnPos[0],
      initFloorY + 0.02,
      initLoc.spawnPos[1]
    );

    scene.add(character.root);
    characterRef.current = character;

    if (ceremonyActiveRef.current) {
      population.setOpeningCeremonyMode(true, true);
      courtyard.setCeremonyFlagState(true, 0);
      character.root.position.set(0.0, 0, -13.6);
      character.root.rotation.y = Math.PI;
      courtyard.contactShadowMesh.position.set(0.0, 0.02, -13.6);
      camera.position.set(-14.5, 9.8, 1.5);
      controls.target.set(0, 5.0, -21.5);
      controls.update();
    } else {
      population.preloadNearbyDialogues(initLoc.spawnPos[0], initLoc.spawnPos[1]);
    }

    // 3. Keyboard Input for Playable Mode (WASD / Arrows + Space Jump + KeyE Chat)
    const pressedKeys = new Set<string>();
    let jumpVelocity = 0;
    let jumpHeight = 0;
    let stepTimer = 0;
    let lastMobileJumpNonce = mobileInputRef?.current ? mobileInputRef.current.jumpNonce : 0;
    let lastReportedX = initLoc.spawnPos[0];
    let lastReportedZ = initLoc.spawnPos[1];
    const clock = new THREE.Clock();
    clockRef.current = clock;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const code = e.code;
      pressedKeys.add(code);

      if (code === 'Space' && jumpHeight <= 0.01) {
        e.preventDefault();
        jumpVelocity = 7.2;
        soundFX.playJump(configRef.current.soundEnabled);
      } else if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 4. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (renderer) {
        renderer.setSize(w, h);
      }
      if (softwareRenderer) {
        softwareRenderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', onResize);

    // 5. Paced Animation Loop
    let frameId = 0;
    let disposed = false;

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const cfg = configRef.current;

      // Update Sky (Sun, Clouds, Flying Birds), Roof Cutaway, Waving Flag & Active School NPCs
      courtyard.updateFlagWave(
        elapsed,
        delta,
        character.root.position.x,
        character.root.position.z,
        cfg.soundEnabled
      );
      population.setEcobrickScatteredState(courtyard.isEcobrickCurrentlyScattered());
      const activeDiag = population.update(
        elapsed,
        delta,
        character.root.position.x,
        character.root.position.z,
        cfg.soundEnabled,
        character.root.position.y + jumpHeight,
        cfg.studentName,
        cfg.genderStyle
      );

      const volBucket = activeDiag ? Math.round(activeDiag.voiceVolume * 50) : 0;
      const newDiagKey = activeDiag
        ? `${activeDiag.npcName}:${activeDiag.npcActivity}:${activeDiag.message}:${volBucket}:${activeDiag.playerReply || ''}`
        : '';
      if (newDiagKey !== lastDialogueKeyRef.current) {
        lastDialogueKeyRef.current = newDiagKey;
        if (onUpdateActiveDialogueRef.current) {
          onUpdateActiveDialogueRef.current(activeDiag);
        }
      }

      // Handle Mobile Jump Button Trigger
      if (
        mobileInputRef?.current &&
        mobileInputRef.current.jumpNonce !== lastMobileJumpNonce
      ) {
        lastMobileJumpNonce = mobileInputRef.current.jumpNonce;
        if (jumpHeight <= 0.01) {
          jumpVelocity = 7.2;
          soundFX.playJump(cfg.soundEnabled);
        }
      }

      // Handle Jump Physics
      if (jumpHeight > 0 || jumpVelocity > 0) {
        jumpHeight += jumpVelocity * delta;
        jumpVelocity -= 18.0 * delta;
        if (jumpHeight <= 0) {
          jumpHeight = 0;
          jumpVelocity = 0;
        }
      }

      // Handle WASD / Arrow / Mobile Virtual Joystick movement (disabled while in Penalty Shootout or Trash Sorting Stage)
      let moveX = mobileInputRef?.current ? mobileInputRef.current.moveX : 0;
      let moveZ = mobileInputRef?.current ? mobileInputRef.current.moveZ : 0;
      const isSortingTrash = cleanupStageRef.current === 'sorting';
      const isMathMission = mathActiveRef.current;
      const isDampuMission = dampuActiveRef.current;
      const isJumpRopeMission = jumpRopeActiveRef.current;
      const isKelerengMission = kelerengActiveRef.current;
      const isCrossingMission = crossingActiveRef.current;
      const isEcobrickMission = ecobrickActiveRef.current;
      const isTonoMission = tonoActiveRef.current;
      const isObstacleRun = obstacleRunActiveRef.current;
      const isCeremony = ceremonyActiveRef.current;

      // Dynamic wide camera FOV for athletic obstacle run perspective
      const targetFov = isObstacleRun ? 68 : 45;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, delta);
        camera.updateProjectionMatrix();
      }
      if (
        !isCeremony &&
        !penaltyActiveRef.current &&
        !isSortingTrash &&
        !isMathMission &&
        !isDampuMission &&
        !isJumpRopeMission &&
        !isKelerengMission &&
        !isCrossingMission &&
        !isEcobrickMission &&
        !isTonoMission &&
        !isObstacleRun
      ) {
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) moveZ -= 1;
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) moveZ += 1;
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) moveX -= 1;
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) moveX += 1;
      } else {
        moveX = 0;
        moveZ = 0;
      }

      const isMoving = isObstacleRun || Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;
      const isRunning =
        isObstacleRun ||
        pressedKeys.has('ShiftLeft') ||
        pressedKeys.has('ShiftRight') ||
        Boolean(mobileInputRef?.current?.isSprinting) ||
        cfg.animation === 'run';

      if (isCeremony) {
        // Position player character at the front of the South student formation (0.0, 0, -13.6) facing North (Math.PI) toward the flagpole
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          0.0,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          -13.6,
          12,
          delta
        );
        character.root.rotation.y = Math.PI;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        const viewMode = ceremonyCameraViewRef.current;
        if (viewMode === 'paskibra') {
          _camGoalPos.set(5.4, 5.6, -11.2);
          _camGoalLook.set(0.0, 6.2, -22.2);
        } else if (viewMode === 'south_students') {
          _camGoalPos.set(0.0, 12.6, 8.5);
          _camGoalLook.set(0.0, 4.5, -22.5);
        } else if (viewMode === 'north_teachers') {
          _camGoalPos.set(-9.5, 7.4, -14.0);
          _camGoalLook.set(0.0, 2.8, -28.2);
        } else {
          // Smooth panoramic camera showing South student columns (Kelas 1-6), 3 Paskibra at flagpole, rising Merah Putih flag, and North teacher row
          const panX = Math.sin(elapsed * 0.16) * 19.5;
          _camGoalPos.set(panX, 10.4, 2.2);
          _camGoalLook.set(0.0, 5.4, -21.8);
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 4, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 4, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 4, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 5, delta);
      } else if (isEcobrickMission) {
        // Position student beside Taman Ecobrick "I LOVE SUGA" (11.8, 0, 50.2) facing the monument alongside Laras (21.4, 0, 50.2)
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          11.8,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          50.2,
          12,
          delta
        );
        character.root.rotation.y = 0.35;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide elevated overview camera showing the entire "I LOVE SUGA" Ecobrick monument, wind-scattered 3D blocks, Laras, and the player
        _camGoalPos.set(14.8, 6.4, 38.8);
        _camGoalLook.set(16.2, 1.85, 53.6);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isCrossingMission) {
        // Position student next to the 24-unit Zebra Cross on the North sidewalk (-4.4, 0, 63.6) facing South (+Z, 0) alongside Pak Joko
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          -4.4,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          63.6,
          12,
          delta
        );
        character.root.rotation.y = 0;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide elevated panoramic camera viewing the 24-unit 2-lane street, realistic cars & motorcycles, Zebra Cross, Pak Joko, and crossing students
        _camGoalPos.set(-18.5, 14.5, 98.5);
        _camGoalLook.set(0.0, 1.8, 75.0);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isTonoMission) {
        // Position student beside Tono (12.8, 0, 61.5) facing South (+Z, 0) toward Mang Asep & Bang Udin's snack carts
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          12.8,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          61.5,
          12,
          delta
        );
        character.root.rotation.y = 0;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Warm eye-level view showing player, Tono, and the colorful street food carts
        _camGoalPos.set(13.6, 2.7, 57.0);
        _camGoalLook.set(14.5, 1.4, 63.2);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isKelerengMission) {
        // Position student at South shooting line of Kelereng circle (14.5, 0, 32.1) facing North (-Z, Math.PI) toward target marbles
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          14.5,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          32.1,
          12,
          delta
        );
        character.root.rotation.y = Math.PI;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide panoramic camera behind player showing full Kelereng circle, 7 marbles, Bimo & Ciko
        _camGoalPos.set(14.5, 7.2, 41.5);
        _camGoalLook.set(14.5, 0.85, 29.2);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isJumpRopeMission) {
        // Position student in the center of the Lompat Tali Karet station (-12.5, 0, 29.5) between Dewi (-15.8) and Intan (-9.2)
        if (jumpRopeBoostRef.current > 0.01) {
          jumpVelocity = Math.max(jumpVelocity, 7.6 * jumpRopeBoostRef.current);
          jumpRopeBoostRef.current = 0;
        }
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          -12.5,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          29.5,
          12,
          delta
        );
        character.root.rotation.y = 0; // Face South (+Z) toward camera while jumping over the rubber-band rope
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide panoramic camera showing Dewi, Intan, Kartika, the full swinging rope span, and jumping player
        _camGoalPos.set(-12.5, 6.8, 42.2);
        _camGoalLook.set(-12.5, 1.75, 29.0);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isDampuMission) {
        // Position student on the South-facing Dampu Bulan court facing South (+Z, rotation.y = 0)
        const tgt = dampuPlayerTargetRef.current;
        if (tgt.hopArc > 0.01) {
          jumpHeight = Math.max(jumpHeight, tgt.hopArc);
          tgt.hopArc = Math.max(0, tgt.hopArc - delta * 3.2);
        }
        character.root.position.x = THREE.MathUtils.damp(
          character.root.position.x,
          tgt.x,
          12,
          delta
        );
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(
          character.root.position.z,
          tgt.z,
          12,
          delta
        );
        character.root.rotation.y = 0; // Facing South (+Z) toward Puncak Bulan!
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide elevated South-facing camera from behind/above player showing Petak 1-8, Puncak Bulan, Wulan & Mentari
        const camZ = Math.max(11.8, character.root.position.z - 12.8);
        const lookZ = Math.min(39.8, character.root.position.z + 7.5);
        _camGoalPos.set(1.5, 9.6, camZ);
        _camGoalLook.set(1.5, 0.8, lookZ);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isMathMission) {
        // Position student inside Ruang Kelas 1A (-58.4, 0.45, -24.0) facing West (-Math.PI / 2) toward the 3D Chalkboard & Bu Maya
        character.root.position.x = THREE.MathUtils.damp(character.root.position.x, -58.4, 12, delta);
        character.root.position.y = 0.45;
        character.root.position.z = THREE.MathUtils.damp(character.root.position.z, -24.0, 12, delta);
        character.root.rotation.y = -Math.PI / 2;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.47,
          character.root.position.z
        );

        // Wide classroom camera looking at the Interactive Kelas 1A Chalkboard (-63.7, 3.8, -24.0), student & Bu Maya
        _camGoalPos.set(-47.4, 5.4, -24.0);
        _camGoalLook.set(-63.7, 3.2, -23.2);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isSortingTrash) {
        // Position student at 4-Bin Waste Sorting Station beside Ruangan Kantin (30.0, 0, 48.8) facing North (-Z, Math.PI) toward 4 Bins at z = 43.2
        character.root.position.x = THREE.MathUtils.damp(character.root.position.x, 30.0, 12, delta);
        character.root.position.y = 0;
        character.root.position.z = THREE.MathUtils.damp(character.root.position.z, 48.8, 12, delta);
        character.root.rotation.y = Math.PI;
        courtyard.contactShadowMesh.position.set(
          character.root.position.x,
          0.02,
          character.root.position.z
        );

        // Wide panoramic camera behind student looking at all 4 Color-Coded Bins & Principal Hendra
        _camGoalPos.set(29.2, 6.8, 59.5);
        _camGoalLook.set(28.8, 1.65, 43.5);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (penaltyActiveRef.current) {
        if (pjokMissionTypeRef.current === 'basket') {
          // Position shooter at free-throw line facing East Basketball Hoop (22.75, 7.5, 10.0)
          character.root.position.x = THREE.MathUtils.damp(character.root.position.x, 12.2, 12, delta);
          character.root.position.y = 0;
          character.root.position.z = THREE.MathUtils.damp(character.root.position.z, 10.0, 12, delta);
          character.root.rotation.y = Math.PI / 2;
          courtyard.contactShadowMesh.position.set(
            character.root.position.x,
            0.02,
            character.root.position.z
          );

          // Wide 3D basketball court camera behind shooter showing full court lane, East Basketball Hoop & Backboard
          _camGoalPos.set(0.5, 6.2, 12.2);
          _camGoalLook.set(22.75, 4.8, 10.0);
        } else {
          // Position shooter at penalty spot facing West Goal (-21.8, 0, 10.0)
          character.root.position.x = THREE.MathUtils.damp(character.root.position.x, -8.35, 12, delta);
          character.root.position.y = 0;
          character.root.position.z = THREE.MathUtils.damp(character.root.position.z, 10.0, 12, delta);
          character.root.rotation.y = -Math.PI / 2;
          courtyard.contactShadowMesh.position.set(
            character.root.position.x,
            0.02,
            character.root.position.z
          );

          // Wide broadcast 3D penalty camera behind shooter showing full penalty box, West Goal, Goalkeeper & Target Reticle
          _camGoalPos.set(4.2, 5.8, 11.8);
          _camGoalLook.set(-21.8, 2.1, 10.0);
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 8, delta);
      } else if (isObstacleRun && characterRef.current) {
        cameraTransitionActiveRef.current = false;
        const px = characterRef.current.root.position.x;
        const py = characterRef.current.root.position.y;
        const pz = characterRef.current.root.position.z;
        const rotY = characterRef.current.root.rotation.y;
        const camDist = 17.5;
        const camHeight = 8.2;
        const camLookAhead = 10.0;

        _camGoalPos.set(
          px - Math.sin(rotY) * camDist,
          camHeight + py * 0.35,
          pz - Math.cos(rotY) * camDist
        );
        _camGoalLook.set(
          px + Math.sin(rotY) * camLookAhead,
          1.8 + py * 0.35,
          pz + Math.cos(rotY) * camLookAhead
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 7.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 7.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 7.5, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 7.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 7.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 7.5, delta);
      } else if (isMoving) {
        cameraTransitionActiveRef.current = false;

        // Compute camera-relative horizontal movement direction (Roblox 3rd-person standard)
        const camDx = controls.target.x - camera.position.x;
        const camDz = controls.target.z - camera.position.z;
        const camHorizLen = Math.hypot(camDx, camDz);

        if (camHorizLen > 0.001) {
          const fwdX = camDx / camHorizLen;
          const fwdZ = camDz / camHorizLen;
          const rightX = -fwdZ;
          const rightZ = fwdX;
          const forwardInput = -moveZ;
          const strafeInput = moveX;
          _moveVec.set(
            fwdX * forwardInput + rightX * strafeInput,
            0,
            fwdZ * forwardInput + rightZ * strafeInput
          ).normalize();
        } else {
          _moveVec.set(moveX, 0, moveZ).normalize();
        }

        const speed = isRunning ? 14.5 : 8.5;
        const prevX = character.root.position.x;
        const prevY = character.root.position.y;
        const prevZ = character.root.position.z;

        const rawNextX = THREE.MathUtils.clamp(prevX + _moveVec.x * speed * delta, -63.0, 63.0);
        const rawNextZ = THREE.MathUtils.clamp(prevZ + _moveVec.z * speed * delta, -60.5, 93.0);
        const [nextX, nextZ] = courtyard.resolvePlayerMovement(
          prevX,
          prevZ,
          rawNextX,
          rawNextZ,
          0.68
        );
        const floorY = getFloorElevation(nextX, nextZ);

        const actualDx = nextX - prevX;
        const actualDy = floorY - prevY;
        const actualDz = nextZ - prevZ;

        character.root.position.set(nextX, floorY, nextZ);

        // Smoothly rotate character towards movement direction
        const targetAngle = Math.atan2(_moveVec.x, _moveVec.z);
        let diff = targetAngle - character.root.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        character.root.rotation.y += diff * Math.min(1, delta * 12);

        // Follow with contact shadow on current floor level
        courtyard.contactShadowMesh.position.set(nextX, floorY + 0.02, nextZ);
        const shadowScale = Math.max(0.55, 1 - jumpHeight * 0.25);
        courtyard.contactShadowMesh.scale.setScalar(shadowScale);

        // Translate camera & OrbitControls target in exact lockstep so camera never drifts into or away from character
        camera.position.x += actualDx;
        camera.position.y += actualDy;
        camera.position.z += actualDz;
        controls.target.set(nextX, floorY + 1.9, nextZ);

        // Footstep sound cadence
        stepTimer += delta * (isRunning ? 3.8 : 2.5);
        if (stepTimer >= 1 && jumpHeight <= 0.02) {
          stepTimer = 0;
          soundFX.playStep(cfg.soundEnabled);
        }

        const movedDistSq =
          (nextX - lastReportedX) * (nextX - lastReportedX) +
          (nextZ - lastReportedZ) * (nextZ - lastReportedZ);
        if (movedDistSq > 0.03 && onUpdatePlayerCoordsRef.current) {
          lastReportedX = nextX;
          lastReportedZ = nextZ;
          const nearest = findNearestLocation(nextX, nextZ);
          onUpdatePlayerCoordsRef.current(nextX, nextZ, nearest);
        }
      } else {
        const shadowScale = Math.max(0.55, 1 - jumpHeight * 0.25);
        courtyard.contactShadowMesh.scale.setScalar(shadowScale);
      }

      // Smooth Camera Preset / Location Transition relative to character's current world position
      if (
        !isCeremony &&
        !penaltyActiveRef.current &&
        !isSortingTrash &&
        !isMathMission &&
        !isDampuMission &&
        !isJumpRopeMission &&
        !isKelerengMission &&
        !isCrossingMission &&
        !isEcobrickMission &&
        !isTonoMission &&
        !isObstacleRun &&
        cameraTransitionActiveRef.current
      ) {
        const preset =
          cleanupStageRef.current === 'collecting'
            ? CAMERA_PRESET_OFFSETS.playground
            : CAMERA_PRESET_OFFSETS[cfg.cameraPreset];
        const charX = character.root.position.x;
        const charZ = character.root.position.z;
        const floorY = getFloorElevation(charX, charZ);
        const isIndoor = floorY > 0.1;

        if (cfg.cameraPreset === 'aerial_map' && cleanupStageRef.current !== 'collecting') {
          _camGoalPos.set(preset.offset[0], preset.offset[1], preset.offset[2]);
          _camGoalLook.set(preset.lookOffset[0], preset.lookOffset[1], preset.lookOffset[2]);
        } else if (
          isIndoor &&
          (cfg.cameraPreset === 'three_quarter' || cfg.cameraPreset === 'playground')
        ) {
          const rotY = character.root.rotation.y;
          const fx = Math.sin(rotY);
          const fz = Math.cos(rotY);
          const rx = Math.cos(rotY);
          const rz = -Math.sin(rotY);

          _camGoalPos.set(
            charX - fx * 5.8 + rx * 2.4,
            floorY + 5.2,
            charZ - fz * 5.8 + rz * 2.4
          );
          _camGoalLook.set(
            charX + fx * 2.5,
            floorY + 2.0,
            charZ + fz * 2.5
          );
        } else {
          const rotY = character.root.rotation.y;
          const ox = preset.offset[0];
          const oz = preset.offset[2];
          const rotatedOx = ox * Math.cos(rotY) + oz * Math.sin(rotY);
          const rotatedOz = -ox * Math.sin(rotY) + oz * Math.cos(rotY);

          _camGoalPos.set(
            charX + rotatedOx,
            floorY + preset.offset[1],
            charZ + rotatedOz
          );
          _camGoalLook.set(
            charX + preset.lookOffset[0],
            floorY + preset.lookOffset[1],
            charZ + preset.lookOffset[2]
          );
        }

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 6, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, 6, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, 6, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, 6, delta);

        if (
          camera.position.distanceToSquared(_camGoalPos) < 0.02 &&
          controls.target.distanceToSquared(_camGoalLook) < 0.02
        ) {
          cameraTransitionActiveRef.current = false;
        }
      }

      const effectiveCfg = isCeremony
        ? { ...cfg, animation: 'hormat_bendera' as const }
        : isObstacleRun
        ? { ...cfg, isPlayMode: true }
        : cfg;
      const effectiveJumpHeight = isObstacleRun ? character.root.position.y : jumpHeight;
      character.updateAnimation(elapsed, delta, effectiveCfg, isMoving, isRunning, effectiveJumpHeight);

      // Always update OrbitControls so camera.lookAt(controls.target) stays synchronized
      controls.update();

      if (renderer) {
        renderer.render(scene, camera);
      } else if (softwareRenderer) {
        softwareRenderer.render(scene, camera, cfg.timeOfDay, cfg.weather);
      }

      frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      soundFX.stopAllVoices();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      if (envMapTexture) {
        envMapTexture.dispose();
      }
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
      if (softwareRenderer && softwareRenderer.domElement.parentNode === container) {
        container.removeChild(softwareRenderer.domElement);
      }
    };
  }, []);

  return <div ref={canvasMountRef} className="w-full h-full relative inset-0" />;
};
