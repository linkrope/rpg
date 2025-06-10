#!/usr/bin/env python3

import random


class Combatant:
    def __init__(self, name, attack_skill, defense_skill, weapon_bonus, armor, encumbrance):
        self.name = name
        self.attack_skill = attack_skill
        self.defense_skill = defense_skill
        self.weapon_bonus = weapon_bonus
        self.armor = armor
        self.encumbrance = encumbrance
        self.penalty = 0

    def get_current_attack_skill(self):
        """Calculate current attack skill with damage penalties"""
        return max(0, self.attack_skill + self.penalty - self.encumbrance)

    def get_current_defense_skill(self):
        """Calculate current defense skill with damage penalties"""
        return max(0, self.defense_skill + self.penalty - self.encumbrance)

    def get_armor_bonus(self, location):
        """Get armor bonus for a specific location"""
        return self.armor.get(location, 0)

    def take_damage(self, damage):
        """Apply damage to this combatant"""
        self.penalty -= damage

    def is_defeated(self):
        """Check if combatant has taken 20+ damage"""
        return self.penalty <= -20

    def heal(self):
        """Heal the combatant, resetting the penalty"""
        self.penalty = 0

    def __str__(self):
        return f"{self.name}: penalty {self.penalty}"


class CombatSimulator:
    def __init__(self, combatant1, combatant2):
        self.combatant1 = combatant1
        self.combatant2 = combatant2
        self.round = 1

    def run_simulation(self):
        """Run the complete combat simulation"""
        winner = None
        while winner is None:
            winner = self.combat_round()

        print(f"\n  {winner.name} wins")
        print(f"  {self.combatant1} | {self.combatant2}")
        print()

        return winner, self.round

    def combat_round(self):
        """Execute one complete round of combat"""
        print(f"-- round {self.round}")
        print(f"  {self.combatant1} | {self.combatant2}")

        # First combatant attacks
        self.attack(self.combatant1, self.combatant2)
        if self.combatant2.is_defeated():
            return self.combatant1  # Winner

        # Second combatant attacks back
        self.attack(self.combatant2, self.combatant1)
        if self.combatant1.is_defeated():
            return self.combatant2  # Winner

        self.round += 1
        return None  # No winner yet

    def attack(self, attacker, defender):
        """Execute an attack from attacker to defender"""
        dice_roll = self.roll_dice()
        strike_location = self.roll_strike_location()
        armor_protection = self.get_armor_protection(defender, strike_location)

        skill_diff = attacker.get_current_attack_skill() - defender.get_current_defense_skill()
        dice_component = dice_roll
        weapon_vs_armor = (attacker.weapon_bonus - armor_protection)
        damage_dealt = max(0, (skill_diff + dice_component) // 5 + weapon_vs_armor)

        print(f"  {attacker.name} rolls {dice_roll}, attacks {strike_location}: {damage_dealt} damage")

        defender.take_damage(damage_dealt)
        return damage_dealt

    def roll_strike_location(self):
        """Roll d100 for strike location"""
        roll = random.randint(1, 100)

        if roll <= 4:
            return 'skull'
        elif roll <= 8:
            return 'face'
        elif roll <= 12:
            return 'neck'
        elif roll <= 20:
            return 'shoulders'
        elif roll <= 26:
            return 'upper arm'
        elif roll <= 30:
            return 'elbow'
        elif roll <= 36:
            return 'forearm'
        elif roll <= 40:
            return 'hand'
        elif roll <= 60:
            return 'thorax'
        elif roll <= 70:
            return 'abdomen'
        elif roll <= 76:
            return 'hip'
        elif roll <= 80:
            return 'groin'
        elif roll <= 88:
            return 'thigh'
        elif roll <= 90:
            return 'knee'
        elif roll <= 96:
            return 'calf'
        else:
            return 'foot'

    def get_armor_protection(self, combatant, location):
        """Get armor protection value for a specific location"""
        return combatant.armor.get(location, 0)

    def roll_dice(self):
        """Roll dice using the n5 system (p5 - p5)"""
        return self.roll_n5()

    def roll_n5(self):
        """Roll n5: p5 minus p5"""
        positive_roll = self.p5()
        negative_roll = self.p5()
        return positive_roll - negative_roll

    def p5(self):
        """Roll p5: count rolls until getting a 1 on d5"""
        rolls = 0
        roll = self.d(5)

        while roll != 1:
            rolls += 1
            roll = self.d(5)

        return rolls

    def d(self, sides):
        """Roll a die with specified number of sides"""
        return random.randint(1, sides)


# Example usage and test
if __name__ == "__main__":
    # Define armor tables
    light_armor = {
        'skull': 0,
        'face': 0,
        'neck': 0,
        'shoulders': 4,
        'upper arm': 4,
        'elbow': 1,
        'forearm': 1,
        'hand': 0,
        'thorax': 4,
        'abdomen': 4,
        'hip': 5,
        'groin': 5,
        'thigh': 2,
        'knee': 5,
        'calf': 5,
        'foot': 4,
    }
    other_armor = {
        'skull': 6,
        'face': 6,
        'neck': 0,
        'shoulders': 1,
        'upper arm': 1,
        'elbow': 0,
        'forearm': 0,
        'hand': 0,
        'thorax': 1,
        'abdomen': 1,
        'hip': 5,
        'groin': 5,
        'thigh': 4,
        'knee': 7,
        'calf': 7,
        'foot': 7,
    }

    # Weapon skill + D x40% add5 Dodge skill = 18 + 8 add5 30 = 26 add5 30
    defense_skill = 33

    # Create combatants with explicit armor tables
    combatant1 = Combatant("Helgya",
        attack_skill=18+8, defense_skill=defense_skill, weapon_bonus=7, armor=light_armor, encumbrance=3)

    # Weapon skill + D x40% add5 Dodge skill = 36 + 2 add5 30 = 38 add5 30
    defense_skill = 40

    combatant2 = Combatant("Ysbrydd",
        attack_skill=36+4, defense_skill=defense_skill, weapon_bonus= 7, armor=other_armor, encumbrance=3)

    # Run simulation
    runs = 100
    wins = {
        combatant1.name: 0,
        combatant2.name: 0,
        }
    total_rounds = 0

    for i in range(runs):
        combatant1.heal()
        combatant2.heal()

        simulator = CombatSimulator(combatant1, combatant2)
        winner, rounds = simulator.run_simulation()

        wins[winner.name] += 1
        total_rounds += rounds

    avg_rounds = total_rounds / runs
    print(f"{wins.get(combatant1.name)}:{wins.get(combatant2.name)} in {avg_rounds:.1f} rounds")
