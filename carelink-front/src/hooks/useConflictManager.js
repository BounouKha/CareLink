// src/hooks/useConflictManager.js
import { useState } from 'react';
import { useAuthenticatedApi } from './useAuth';

export const useConflictManager = () => {
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const { post } = useAuthenticatedApi();
  const checkConflicts = async (schedulingData, excludeIds = {}) => {
    setIsCheckingConflicts(true);
    try {
      const payload = {
        provider_id: schedulingData.provider_id,
        date: schedulingData.date,
        start_time: schedulingData.start_time,
        end_time: schedulingData.end_time,
        ...excludeIds // exclude_schedule_id, exclude_timeslot_id for updates
      };

      // Only include patient_id if it's provided (not empty/null for blocked time)
      if (schedulingData.patient_id) {
        payload.patient_id = schedulingData.patient_id;
      }const response = await post('http://localhost:8000/schedule/check-conflicts/', payload);
      if (response.has_conflicts) {
        // Store the complete response with proper structure
        setConflicts(response);
        setShowConflictDialog(true);
        return { hasConflicts: true, conflictData: response };
      }
      
      return { hasConflicts: false, conflictData: null };
      
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleConflictResolution = (action, forceSchedule = false) => {
    if (action === 'confirm' || forceSchedule) {
      // User wants to proceed despite conflicts
      setShowConflictDialog(false);
      setConflicts(null);
      return { action: 'proceed', forceSchedule: true };
    } else if (action === 'modify') {
      // User wants to modify the scheduling
      setShowConflictDialog(false);
      return { action: 'modify', forceSchedule: false };
    } else {
      // User cancelled
      setShowConflictDialog(false);
      setConflicts(null);
      return { action: 'cancel', forceSchedule: false };
    }
  };

  const resetConflicts = () => {
    setConflicts(null);
    setShowConflictDialog(false);
  };

  return {
    // State
    isCheckingConflicts,
    conflicts,
    showConflictDialog,
    
    // Actions
    checkConflicts,
    handleConflictResolution,
    resetConflicts,
    
    // Helper to check if we should force schedule
    shouldForceSchedule: (schedulingData) => {
      return { ...schedulingData, force_schedule: true };
    },
    
    // Helper to check if we should force update
    shouldForceUpdate: (updateData) => {
      return { ...updateData, force_update: true };
    }
  };
};
