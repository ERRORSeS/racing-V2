export type PregnancyStatus = 'unconfirmed' | 'confirmed' | 'needs_recheck' | 'late_term' | 'foaling' | 'foaled' | 'lost';
export interface BreedingAttempt {
 id:string; mareId:string; stallionId:string; breedingCycleId:string;
 method:'natural'|'creative_ai'|'unknown'; serviceDayIndexes:number[];
 firstServiceDayIndex:number|null; estimatedOvulationDayIndex?:number;
 contractId:string; ownerAtCoveringId:string|null;
 outcome:'pending'|'conceived'|'not_conceived'; linkedPregnancyId?:string;
 legacy?:boolean; schemaVersion?:8;
}
export interface MarePregnancy {
 id:string; breedingAttemptId:string; mareId:string; sireId:string;
 recordedCoverDayIndex:number|null; estimatedConceptionDayIndex:number|null;
 status:PregnancyStatus; initialEstimatedGestationDays:number;
 currentEstimatedGestationDays:number; hiddenCommittedOutcomeDayIndex:number|null;
 estimatedDueDayIndex:number|null; expectedWindowStartDayIndex:number|null;
 expectedWindowEndDayIndex:number|null; scanEventIds:string[]; mareMedicalCaseIds:string[];
 recordedOutcome?:'live_foal'|'loss'|'other_veterinary_outcome'|null;
 actualFoalingDayIndex?:number|null; liveFoalId?:string|null; confirmedOn:number|null;
 registryModeAtCovering:string; createdAtWorldRevision:number; schemaVersion:8;
 legacy?:boolean; legacyConfirmation?:boolean; committedLossDay?:number|null;
 twinRisk?:boolean; twinManaged?:boolean; carePlan:string; foalingWatch:boolean;
}
export interface PregnancyScan {
 id:string; attemptId:string; mareId:string; kind:string; dueDay:number;
 status:'recommended'|'booked'|'completed'|'canceled'; completedDay?:number;
 result?:'positive'|'negative'|'multiple-risk'; report?:string; notified?:boolean;
}
export interface StudContract {
 id:string; attemptId:string; mareId:string; sireId:string;
 serviceDayIndexes:number[]; mareOwnerAtCovering:string|null;
 sireOwnerAtCovering:string|null; breederOfRecord:string|null; fee:string|null;
 method:'natural'|'creative_ai'|'unknown'; registryEligibility:string;
 offspringRights:string; legacy:boolean; createdDay:number|null;
}
