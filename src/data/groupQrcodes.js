// 企业微信进群路由映射（可按城市/品种持续扩展）

const defaultRoute = {
  routeType: 'default',
  routeKey: 'default_all',
  routeLabel: '全国综合交流群',
  qrcode: '/qrcode.png',
  advisoryText: '优先匹配同品种与同城群'
}

const cityRouteMap = {
  上海: {
    routeType: 'city',
    routeKey: 'city_shanghai',
    routeLabel: '上海养宠交流群',
    qrcode: '/qrcodes/shanghai.png',
    advisoryText: '上海同城群优先入群'
  },
  北京: {
    routeType: 'city',
    routeKey: 'city_beijing',
    routeLabel: '北京养宠交流群',
    qrcode: '/qrcodes/beijing.png',
    advisoryText: '北京同城群优先入群'
  },
  深圳: {
    routeType: 'city',
    routeKey: 'city_shenzhen',
    routeLabel: '深圳养宠交流群',
    qrcode: '/qrcodes/shenzhen.png',
    advisoryText: '深圳同城群优先入群'
  },
  广州: {
    routeType: 'city',
    routeKey: 'city_guangzhou',
    routeLabel: '广州养宠交流群',
    qrcode: '/qrcodes/guangzhou.png',
    advisoryText: '广州同城群优先入群'
  }
}

const breedRouteMap = {
  柯基犬: {
    routeType: 'breed',
    routeKey: 'breed_corgi',
    routeLabel: '柯基犬专属群',
    qrcode: '/qrcodes/corgi.png',
    advisoryText: '柯基犬群优先入群'
  },
  金毛寻回犬: {
    routeType: 'breed',
    routeKey: 'breed_golden',
    routeLabel: '金毛专属群',
    qrcode: '/qrcodes/golden.png',
    advisoryText: '金毛犬群优先入群'
  },
  英短猫: {
    routeType: 'breed',
    routeKey: 'breed_british_shorthair',
    routeLabel: '英短猫专属群',
    qrcode: '/qrcodes/british_shorthair.png',
    advisoryText: '英短猫群优先入群'
  }
}

const breedCityRouteMap = {
  '柯基犬|上海': {
    routeType: 'breed_city',
    routeKey: 'breed_city_corgi_shanghai',
    routeLabel: '上海柯基交流群',
    qrcode: '/qrcodes/corgi_shanghai.png',
    advisoryText: '已命中上海柯基专属群'
  }
}

export function resolveGroupRoute(cardData = {}) {
  const city = String(cardData.city || '').trim()
  const breed = String(cardData.breed || '').trim()

  if (breed && city) {
    const breedCityKey = `${breed}|${city}`
    if (breedCityRouteMap[breedCityKey]) {
      return {
        ...breedCityRouteMap[breedCityKey],
        city,
        breed
      }
    }
  }

  if (breed && breedRouteMap[breed]) {
    return {
      ...breedRouteMap[breed],
      city,
      breed
    }
  }

  if (city && cityRouteMap[city]) {
    return {
      ...cityRouteMap[city],
      city,
      breed
    }
  }

  return {
    ...defaultRoute,
    city,
    breed
  }
}

export function getGroupQrcode(cardData = {}) {
  return resolveGroupRoute(cardData).qrcode
}
