#!/usr/bin/env python3


def coverage(*locations):
    """Return the sum of percentages for a list of strike locations."""
    return sum(strike_percentage(location) for location in locations)


def strike_percentage(location):
    """Return the percentage chance of hitting a given strike location."""
    percentages = {
        'skull': 4,
        'face': 4,
        'neck': 4,
        'shoulders': 8,
        'upper arm': 6,
        'elbow': 4,
        'forearm': 6,
        'hand': 4,
        'thorax': 20,
        'abdomen': 10,
        'hip': 6,
        'groin': 4,
        'thigh': 8,
        'knee': 2,
        'calf': 6,
        'foot': 4
    }

    return percentages.get(location)


def cap():
    return coverage('skull')


def three_quarter_helm():
    return coverage('skull', 'face')


def great_helm():
    return coverage('skull', 'face', 'neck')


def hood():
    return coverage('skull', 'neck')


def vest():
    return coverage('shoulders', 'thorax', 'abdomen')


def tunic():
    return coverage('upper arm', 'shoulders', 'thorax', 'abdomen', 'hip', 'groin')


def surcoat():
    return coverage('shoulders', 'thorax', 'abdomen', 'hip', 'groin', 'thigh')


def gambeson():
    return coverage('forearm', 'elbow', 'upper arm', 'shoulders', 'thorax', 'abdomen', 'hip', 'groin', 'thigh')


def robe():
    return coverage('forearm', 'elbow', 'upper arm', 'shoulders', 'thorax', 'abdomen', 'hip', 'groin', 'thigh', 'knee', 'calf')


def leggings():
    return coverage('hip', 'groin', 'thigh', 'knee', 'calf', 'foot')


def gauntlets():
    return coverage('hand')


def breastplate():
    return coverage('thorax', 'abdomen') // 2


def ailettes():
    return coverage('shoulders')


def rerebraces():
    return coverage('upper arm')


def coudes():
    return coverage('elbow')


def vambraces():
    return coverage('forearm')


def kneecops():
    return coverage('knee')


def greaves():
    return coverage('calf')


def shoes():
    return coverage('foot')


def calf_boots():
    return coverage('calf', 'foot')


def knee_boots():
    return coverage('knee', 'calf', 'foot')


def weight(material, coverage):
    """Return the weight of a piece of armor based on its material."""
    weights = {
        'buckram': 0.1,
        'kurbul': 0.4,
        'leather': 0.2,
        'linen': 0.1,
        'mail': 0.5,
        'plate': 0.8,
        'quilt': 0.3,
        'ring': 0.4,
        'russet': 0.1,
        'scale': 0.5,
        'serge': 0.1,
        'silk': 0.05,
        'wool': 0.15,
        'worsted': 0.075,
    }

    return weights.get(material) * coverage


def price(material, coverage):
    """Return the price of a piece of armor based on its material."""
    prices = {
        'buckram': 2,
        'kurbul': 5,
        'leather': 4,
        'linen': 2,
        'mail': 15,
        'plate': 25,
        'quilt': 4,
        'ring': 7,
        'russet': 3,
        'scale': 7.5,
        'serge': 2,
        'silk': 20,
        'wool': 4,
        'worsted': 10,
    }

    price_reduction = (100 - coverage // 10 * 5) / 100
    return round(prices.get(material) * coverage * price_reduction)


if __name__ == "__main__":
    for material in ['buckram', 'kurbul', 'leather', 'linen', 'mail', 'plate', 'quilt', 'ring', 'russet', 'scale', 'serge', 'silk', 'wool', 'worsted']:
        print(f"| {material} | weight | price |")
        print('| - | - |')
        print(f"| cap/half helm | {weight(material, cap()):.1f} | {price(material, cap())} |")
        print(f"| 3/4 helm | {weight(material, three_quarter_helm()):.1f} | {price(material, three_quarter_helm())} |")
        print(f"| great helm | {weight(material, great_helm()):.1f} | {price(material, great_helm())} |")
        print(f"| cowl/hood | {weight(material, hood()):.1f} | {price(material, hood())} |")
        print(f"| vest | {weight(material, vest()):.1f} | {price(material, vest())} |")
        print(f"| tunic/byrnie | {weight(material, tunic()):.1f} | {price(material, tunic())} |")
        print(f"| surcoat | {weight(material, surcoat()):.1f} | {price(material, surcoat())} |")
        print(f"| gambeson/hauberk | {weight(material, gambeson()):.1f} | {price(material, gambeson())} |")
        print(f"| robe | {weight(material, robe()):.1f} | {price(material, robe())} |")
        print(f"| leggings | {weight(material, leggings()):.1f} | {price(material, leggings())} |")
        print(f"| gauntlets/mittens | {weight(material, gauntlets()):.1f} | {price(material, gauntlets())} |")
        print(f"| breast/backplate | {weight(material, breastplate()):.1f} | {price(material, breastplate())} |")
        print(f"| ailettes | {weight(material, ailettes()):.1f} | {price(material, ailettes())} |")
        print(f"| rerebraces | {weight(material, rerebraces()):.1f} | {price(material, rerebraces())} |")
        print(f"| coudes | {weight(material, coudes()):.1f} | {price(material, coudes())} |")
        print(f"| vambraces | {weight(material, vambraces()):.1f} | {price(material, vambraces())} |")
        print(f"| kneecops | {weight(material, kneecops()):.1f} | {price(material, kneecops())} |")
        print(f"| greaves | {weight(material, greaves()):.1f} | {price(material, greaves())} |")
        print(f"| shoes | {weight(material, shoes()):.1f} | {price(material, shoes())} |")
        print(f"| calf boots | {weight(material, calf_boots()):.1f} | {price(material, calf_boots())} |")
        print(f"| knee boots | {weight(material, knee_boots()):.1f} | {price(material, knee_boots())} |")
        print()
