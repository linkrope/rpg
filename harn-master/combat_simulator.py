#!/usr/bin/env python3

import argparse
import random
from weapon_crafter import Armour, Armoury, Aspect


class Combatant:
    def __init__(self, name, weapon_skill, dodge_skill, armour, weapon, shield_skill=None, shield=None, load=0.0):
        self.name = name
        self.armour = armour
        self.weapon = weapon
        self.shield = shield
        load += self.armour.total_weight() + self.weapon.weight
        self.attack_skill = weapon_skill + self.weapon.A * 4 // 10
        if self.shield:
            load += self.shield.weight
            self.defense_skill = add5(shield_skill + self.shield.D * 4 // 10, dodge_skill)
        else:
            self.defense_skill = add5(weapon_skill + self.weapon.D * 4 // 10, dodge_skill)
        self.encumbrance = round(load / 10)
        self.penalty = 0

    def current_attack_skill(self):
        """Calculate current attack skill with damage penalties"""
        return self.attack_skill + self.penalty - self.encumbrance

    def current_defense_skill(self):
        """Calculate current defense skill with damage penalties"""
        return add5(self.defense_skill + self.penalty - self.encumbrance, -10)

    def armour_protection(self, aspect : Aspect, location):
        """Get armour protection value for specific aspect for specific location."""
        return self.armour.total_protection(aspect)[location]

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

        print()
        print(f"  {combatant1.name if winner == 1 else combatant2.name} wins")
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
            return 1

        # second combatant attacks back
        self.attack(self.combatant2, self.combatant1)
        if self.combatant1.is_defeated():
            return 2

        self.round += 1
        return None  # No winner yet

    def attack(self, attacker, defender):
        """Execute an attack from attacker to defender"""
        dice_roll = n5()
        current_strike_location = strike_location()
        armour_protection = defender.armour_protection(attacker.weapon.aspect, current_strike_location)

        skill_diff = attacker.current_attack_skill() - defender.current_defense_skill()
        weapon_vs_armour = (attacker.weapon.bonus - armour_protection)
        damage = max(0, (skill_diff + dice_roll) // 5 + weapon_vs_armour)

        print(f"  {attacker.name} rolls {dice_roll}, attacks {current_strike_location}: {damage} damage")
        print(f"    (skill diff: {skill_diff}, weapon vs armour: {weapon_vs_armour})")

        defender.take_damage(damage)


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
        return 'Sk'
    if roll <= 8:
        return 'Fa'
    if roll <= 12:
        return 'Nk'
    if roll <= 20:
        return 'Sh'
    if roll <= 26:
        return 'Ua'
    if roll <= 30:
        return 'El'
    if roll <= 36:
        return 'Fo'
    if roll <= 40:
        return 'Ha'
    if roll <= 60:
        return 'Tx'
    if roll <= 70:
        return 'Ab'
    if roll <= 76:
        return 'Hp'
    if roll <= 80:
        return 'Gr'
    if roll <= 88:
        return 'Th'
    if roll <= 90:
        return 'Kn'
    if roll <= 96:
        return 'Ca'
    if roll <= 100:
        return 'Ft'


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
    spear=18
    dodge=30

    armour = Armour()\
        .add('linen', 'robe')\
        .add('leather', 'cowl')\
        .add('leather', 'tunic')\
        .add('leather', 'leggings')\
        .add('leather', 'knee boots')

    return Combatant(
        "Helgya",
        weapon_skill=spear,
        dodge_skill=dodge,
        armour=armour,
        weapon=Armoury().get('spear'),
        load=Armoury().get("dagger").weight,
    )


def ysbrydd():
    sword = 37
    dodge = 28

    armour = Armour()\
        .add('plate', '3/4 helm')\
        .add('quilt', 'cowl')\
        .add('leather', 'tunic')\
        .add('leather', 'gauntlets')\
        .add('leather', 'leggings')\
        .add('leather', 'shoes')\
        .add('kurbul', 'chest/back')\
        .add('kurbul', 'ailettes')\
        .add('kurbul', 'rerebraces')\
        .add('kurbul', 'coudes')\
        .add('kurbul', 'vambraces')\
        .add('kurbul', 'kneecops')\
        .add('kurbul', 'greaves')

    return Combatant(
        "Ysbrydd",
        weapon_skill=sword,
        dodge_skill=dodge,
        armour=armour,
        weapon=Armoury().get('battlesword'),
        load=Armoury().get("round shield").weight,
    )


def guard():
    # guard commander
    spear = 85 * 4 // 10
    dodge = 30 * 4 // 10

    armour = Armour()\
        .add('kurbul', 'half helm')\
        .add('leather', 'coif')\
        .add('serge', 'shirt')\
        .add('serge', 'tunic, long')\
        .add('ring', 'hauberk, short')\
        .add('linen', 'surcoat, long')\
        .add('linen', 'breeches')\
        .add('serge', 'hose')\
        .add('leather', 'calf boots')

    return Combatant(
        "Guard",
        weapon_skill=spear,
        dodge_skill=dodge,
        armour=armour,
        weapon=Armoury().get('spear'),
    )


def infantry():
    # medium infantry
    sword = 32
    shield = 32
    dodge = 24

    armour = Armour()\
        .add('mail', 'cowl')\
        .add('mail', 'hauberk')\
        .add('leather', 'vest')\
        .add('mail', 'mittens')\
        .add('leather', 'leggings')\
        .add('leather', 'knee boots')

    return Combatant(
        "Infantry",
        weapon_skill=sword,
        shield_skill=shield,
        dodge_skill=dodge,
        armour=armour,
        weapon=Armoury().get('broadsword'),
        shield=Armoury().get('knight shield'),
    )


def knight():
    # knight bachelor
    sword = 70 * 4 // 10
    shield = 75 * 4 // 10
    dodge = 20 * 4 // 10

    armour = Armour()\
        .add('mail', 'cowl')\
        .add('leather', 'coif')\
        .add('serge', 'shirt')\
        .add('quilt', 'gambeson')\
        .add('mail', 'tabard')\
        .add('linen', 'surcoat, long')\
        .add('linen', 'breeches')\
        .add('serge', 'hose')\
        .add('leather', 'calf boots')

    return Combatant(
        "Knight",
        weapon_skill=sword,
        shield_skill=shield,
        dodge_skill=dodge,
        armour=armour,
        weapon=Armoury().get('broadsword'),
        shield=Armoury().get('knight shield'),
    )


# Example usage and test
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Combat simulation between two combatants")
    parser.add_argument('combatant1', help='First combatant')
    parser.add_argument('combatant2', help='Second combatant')

    combatants = {combatant().name: combatant for combatant in (helgya, ysbrydd, guard, infantry, knight)}

    try:
        args = parser.parse_args()
    except SystemExit:
        print()
        for combatant in combatants.values():
            combatant = combatant()
            print(f"{combatant.name}")
            print(f'encumbrance: {combatant.encumbrance}, '
                f'armour: {combatant.armour.total_weight():.1f} lbs, {combatant.armour.total_price()}d')
            print()
            combatant.armour.print_protection()

        raise

    combatant1 = combatants[args.combatant1]()
    combatant2 = combatants[args.combatant2]()

    # Run simulation
    runs = 1000
    wins = {1: 0, 2: 0}
    total_rounds = 0

    for i in range(runs):
        combatant1.heal()
        combatant2.heal()

        simulator = CombatSimulator(combatant1, combatant2)
        winner, rounds = simulator.run_simulation()

        wins[winner] += 1
        total_rounds += rounds

    print(f"{wins[1]}:{wins[2]} in {total_rounds / runs:.1f} rounds")
