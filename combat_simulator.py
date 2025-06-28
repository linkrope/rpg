#!/usr/bin/env python3

from weapon_crafter import Armour
import random


class Combatant:
    def __init__(self, name, attack_skill, defense_skill, weapon_bonus, armour, encumbrance):
        self.name = name
        self.attack_skill = attack_skill
        self.defense_skill = defense_skill
        self.weapon_bonus = weapon_bonus
        self.armour = armour
        self.encumbrance = encumbrance
        self.penalty = 0

    def get_current_attack_skill(self):
        """Calculate current attack skill with damage penalties"""
        return self.attack_skill + self.penalty - self.encumbrance

    def get_current_defense_skill(self):
        """Calculate current defense skill with damage penalties"""
        return add5(self.defense_skill + self.penalty - self.encumbrance, -10)

    def get_armour_protection(self, location):
        """Get armour protection value for a specific location."""
        return self.armour.get(location, 0)

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
        armour_protection = defender.get_armour_protection(current_strike_location)

        skill_diff = attacker.get_current_attack_skill() - defender.get_current_defense_skill()
        weapon_vs_armour = (attacker.weapon_bonus - armour_protection)
        damage = max(0, (skill_diff + dice_roll) // 5 + weapon_vs_armour)

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

    armour = Armour()\
        .add('linen', 'robe')\
        .add('leather', 'cowl')\
        .add('leather', 'tunic')\
        .add('leather', 'leggings')\
        .add('leather', 'knee boots')
    encumbrance = round((6 + armour.total_weight()) / 10)

    return Combatant(
        "Helgya",
        attack_skill=(spear + A * 4 // 10),
        defense_skill=add5(spear + D * 4 // 10, dodge),
        weapon_bonus=7,
        armour=armour.total_protection('P'),
        encumbrance=encumbrance,
    )


def ysbrydd():
    battlesword = 37
    dodge = 28
    A, D = 25, 10

    armour = Armour()\
        .add('plate', '3/4 helm')\
        .add('quilt', 'cowl')\
        .add('linen', 'vest')\
        .add('leather', 'tunic')\
        .add('leather', 'gauntlets')\
        .add('linen', 'leggings')\
        .add('leather', 'leggings')\
        .add('leather', 'shoes')\
        .add('kurbul', 'chest/back')\
        .add('kurbul', 'ailettes')\
        .add('kurbul', 'rerebraces')\
        .add('kurbul', 'coudes')\
        .add('kurbul', 'vambraces')\
        .add('kurbul', 'kneecops')\
        .add('kurbul', 'greaves')
    encumbrance = round((14 + armour.total_weight()) / 10)

    return Combatant(
        "Ysbrydd",
        attack_skill=(battlesword + A * 4 // 10),
        defense_skill=add5(battlesword + D * 4 // 10, dodge),
        weapon_bonus=8,
        armour=armour.total_protection('E'),
        encumbrance=encumbrance,
    )


def knight():
    broadsword = 32
    shield = 32
    dodge = 24
    A, D = 15, 20

    armour = Armour()\
        .add('mail', 'cowl')\
        .add('mail', 'hauberk')\
        .add('leather', 'vest')\
        .add('mail', 'mittens')\
        .add('leather', 'leggings')\
        .add('leather', 'shoes')
    encumbrance = round((8 + armour.total_weight()) / 10)

    return Combatant(
        "Knight",
        attack_skill=(broadsword + A * 4 // 10),
        defense_skill=add5(shield + D * 4 // 10, dodge),
        weapon_bonus=5,
        armour=armour.total_protection('E'),
        encumbrance=encumbrance,
    )


# Example usage and test
if __name__ == "__main__":
    combatant1 = ysbrydd()
    combatant2 = knight()

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
