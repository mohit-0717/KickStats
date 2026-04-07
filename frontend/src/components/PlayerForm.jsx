import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePlayers } from '../hooks/usePlayers';

const playerSchema = z.object({
    firstName: z.string().min(2, 'First name is too short'),
    lastName: z.string().min(2, 'Last name is too short'),
    position: z.string().min(1, 'Position is required'),
    nationality: z.string().min(2, 'Nationality is required'),
    preferredFoot: z.enum(['Left', 'Right', 'Both']),
    height: z.number().min(150, 'Minimum height is 150 cm').max(230, 'Maximum height is 230 cm'),
    weight: z.number().min(50, 'Minimum weight is 50 kg').max(150, 'Maximum weight is 150 kg'),
    jerseyNumber: z.number().min(1, 'Minimum jersey number is 1').max(99, 'Maximum jersey number is 99'),
    bio: z.string().max(500, 'Biography must be 500 characters or less').optional().or(z.literal('')),
});

const errorTextStyle = {
    margin: '0.35rem 0 0',
    color: '#fca5a5',
    fontSize: '0.9rem'
};

const PlayerForm = () => {
    const { addPlayer, loading } = usePlayers();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(playerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            position: '',
            nationality: '',
            preferredFoot: 'Right',
            height: '',
            weight: '',
            jerseyNumber: 9,
            bio: ''
        }
    });

    const onSubmit = async (data) => {
        const success = await addPlayer(data);

        if (success) {
            reset();
        }
    };

    const disabled = loading || isSubmitting;

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '1rem', maxWidth: '560px' }}>
            <div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input {...register('firstName')} placeholder="First name" className="form-input" />
                    <input {...register('lastName')} placeholder="Last name" className="form-input" />
                </div>
                {(errors.firstName || errors.lastName) && (
                    <p style={errorTextStyle}>{errors.firstName?.message || errors.lastName?.message}</p>
                )}
            </div>

            <div>
                <select {...register('position')} className="form-input">
                    <option value="">Select position</option>
                    <option value="Forward">Forward</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Defender">Defender</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                </select>
                {errors.position && <p style={errorTextStyle}>{errors.position.message}</p>}
            </div>

            <div>
                <input {...register('nationality')} placeholder="Nationality" className="form-input" />
                {errors.nationality && <p style={errorTextStyle}>{errors.nationality.message}</p>}
            </div>

            <div>
                <select {...register('preferredFoot')} className="form-input">
                    <option value="Right">Right foot</option>
                    <option value="Left">Left foot</option>
                    <option value="Both">Both feet</option>
                </select>
                {errors.preferredFoot && <p style={errorTextStyle}>{errors.preferredFoot.message}</p>}
            </div>

            <div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input type="number" {...register('height', { valueAsNumber: true })} placeholder="Height (cm)" className="form-input" />
                    <input type="number" {...register('weight', { valueAsNumber: true })} placeholder="Weight (kg)" className="form-input" />
                </div>
                {(errors.height || errors.weight) && (
                    <p style={errorTextStyle}>{errors.height?.message || errors.weight?.message}</p>
                )}
            </div>

            <div>
                <input type="number" {...register('jerseyNumber', { valueAsNumber: true })} placeholder="Jersey number" className="form-input" />
                {errors.jerseyNumber && <p style={errorTextStyle}>{errors.jerseyNumber.message}</p>}
            </div>

            <div>
                <textarea
                    {...register('bio')}
                    placeholder="Player biography"
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical' }}
                />
                {errors.bio && <p style={errorTextStyle}>{errors.bio.message}</p>}
            </div>

            <button
                type="submit"
                disabled={disabled}
                style={{
                    padding: '1rem',
                    background: disabled ? '#475569' : '#2563eb',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: 'none',
                    width: '100%'
                }}
            >
                {disabled ? 'Saving...' : 'Add Player'}
            </button>
        </form>
    );
};

export default PlayerForm;
