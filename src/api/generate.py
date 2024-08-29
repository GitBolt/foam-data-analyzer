import pandas as pd
import numpy as np

def generate_synthetic_data(num_samples=50):
    np.random.seed(42)  # For reproducibility

    data = []
    filler_percentages = np.linspace(0, 80, num_samples)  # Up to 80% filler

    for filler in filler_percentages:
        for impact_energy in [40, 80, 120]:  # Similar to original data
            # Absorbed energy
            # As filler % increases, absorbed energy generally increases
            base_absorbed = impact_energy * (0.05 + 0.001 * filler)
            absorbed_energy = base_absorbed * np.random.uniform(0.9, 1.1)

            # Coefficient of Restitution (COR)
            # COR generally decreases with increasing filler %
            base_cor = 0.98 - (0.0005 * filler)
            cor = max(min(base_cor * np.random.uniform(0.98, 1.02), 1), 0)

            # Energy Loss Parameter (ELP)
            # ELP tends to increase with filler % and impact energy
            base_elp = 4 + (0.07 * filler) + (0.02 * impact_energy)
            elp = base_elp * np.random.uniform(0.95, 1.05)

            data.append([filler, impact_energy, absorbed_energy, cor, elp])

    df = pd.DataFrame(data, columns=['filler_percentage', 'impact_energy', 'absorbed_energy', 'cor', 'elp'])
    return df

# Generate synthetic data
synthetic_data = generate_synthetic_data()

# Load original data
original_data = pd.read_csv('data.csv')

# Combine original and synthetic data
combined_data = pd.concat([original_data, synthetic_data], ignore_index=True)

# Sort the combined data
combined_data = combined_data.sort_values(['filler_percentage', 'impact_energy'])

# Save the combined data
combined_data.to_csv('enhanced_data.csv', index=False)

print(combined_data)