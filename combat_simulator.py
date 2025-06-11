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
        return self.attack_skill + self.penalty - self.encumbrance

    def get_current_defense_skill(self):
        """Calculate current defense skill with damage penalties"""
        return add5(self.defense_skill + self.penalty - self.encumbrance, -10)

    def get_armor_protection(self, location):
        """Get armor protection value for a specific location."""
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

        # first combatant attacks
        self.attack(self.combatant1, self.combatant2)
        if self.combatant2.is_defeated():
            return self.combatant1  # Winner

        # second combatant attacks back
        self.attack(self.combatant2, self.combatant1)
        if self.combatant1.is_defeated():
            return self.combatant2  # Winner

        self.round += 1
        return None  # No winner yet

    def attack(self, attacker, defender):
        """Execute an attack from attacker to defender"""
        dice_roll = n5()
        current_strike_location = strike_location()
        armor_protection = defender.get_armor_protection(current_strike_location)

        skill_diff = attacker.get_current_attack_skill() - defender.get_current_defense_skill()
        weapon_vs_armor = (attacker.weapon_bonus - armor_protection)
        damage = max(0, (skill_diff + dice_roll) // 5 + weapon_vs_armor)

        print(f"  {attacker.name} rolls {dice_roll}, attacks {current_strike_location}: {damage} damage")

        defender.take_damage(damage)
        return damage


def n5():
    """Roll n5: p5 minus p.5"""
    positive_roll = p5()
    negative_roll = p5()
    return positive_roll - negative_roll


def p5():
    """Roll p5: count rolls until getting a 1 on d5."""
    rolls = 0
    roll = d(5)

    while roll != 1:
        rolls += 1
        roll = d(5)

    return rolls


def strike_location():
    """Roll d100 for strike location."""
    roll = random.randint(1, 100)

    if roll <= 4:
        return 'skull'
    if roll <= 8:
        return 'face'
    if roll <= 12:
        return 'neck'
    if roll <= 20:
        return 'shoulders'
    if roll <= 26:
        return 'upper arm'
    if roll <= 30:
        return 'elbow'
    if roll <= 36:
        return 'forearm'
    if roll <= 40:
        return 'hand'
    if roll <= 60:
        return 'thorax'
    if roll <= 70:
        return 'abdomen'
    if roll <= 76:
        return 'hip'
    if roll <= 80:
        return 'groin'
    if roll <= 88:
        return 'thigh'
    if roll <= 90:
        return 'knee'
    if roll <= 96:
        return 'calf'
    if roll <= 100:
        return 'foot'


def d(sides):
    """Roll a die with specified number of sides."""
    return random.randint(1, sides)


def add5(a, b):
    """
    Add a bonus to the greater number based on their difference.

    Difference ranges and bonuses:
    0-1: +5, 2-3: +4, 4-6: +3, 7-10: +2, 11-19: +1, 20+: +0
    """
    diff = abs(a - b)
    greater = max(a, b)

    if diff <= 1:
        return greater + 5
    if diff <= 3:
        return greater + 4
    if diff <= 6:
        return greater + 3
    if diff <= 10:
        return greater + 2
    if diff <= 19:
        return greater + 1

    return greater


def helgya():
    spear = 18
    dodge = 30
    A, D = 20, 10
    # only P
    armor = {
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

    return Combatant(
        "Helgya",
        attack_skill=(spear + A * 4 // 10),
        defense_skill=add5(spear + D * 4 // 10, dodge),
        weapon_bonus=7,
        armor=armor,
        encumbrance=3,
    )


def ysbrydd():
    shortsword = 37
    dodge = 28
    A, D = 10, 5

    # only P
    armor = {
        'skull': 8,
        'face': 6,
        'neck': 2,
        'shoulders': 3,
        'upper arm': 2,
        'elbow': 0,
        'forearm': 0,
        'hand': 0,
        'thorax': 3,
        'abdomen': 3,
        'hip': 6,
        'groin': 6,
        'thigh': 4,
        'knee': 4,
        'calf': 4,
        'foot': 7,
    }

    return Combatant(
        "Ysbrydd",
        attack_skill=(shortsword + A * 4 // 10),
        defense_skill=add5(shortsword + D * 4 // 10, dodge),
        weapon_bonus=4,
        armor=armor,
        encumbrance=5,
    )


def knight():
    broadsword = 32
    shield = 32
    dodge = 24
    A, D = 15, 20

    # mail cowl, hauberk, mittens, leather boots
    # only P
    armor = {
        'skull': 5,
        'face': 0,
        'neck': 5,
        'shoulders': 5,
        'upper arm': 5,
        'elbow': 5,
        'forearm': 5,
        'hand': 5,
        'thorax': 5,
        'abdomen': 5,
        'hip': 5,
        'groin': 5,
        'thigh': 5,
        'knee': 3,
        'calf': 3,
        'foot': 3,
    }

    return Combatant(
        "Knight",
        attack_skill=(broadsword + A * 4 // 10),
        defense_skill=add5(shield + D * 4 // 10, dodge),
        weapon_bonus=4,
        armor=armor,
        encumbrance=5,
    )


# Example usage and test
if __name__ == "__main__":
    combatant1 = knight()
    combatant2 = ysbrydd()

    # Run simulation
    runs = 1000
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

    print(f"{wins.get(combatant1.name)}:{wins.get(combatant2.name)} in {total_rounds / runs:.1f} rounds")
