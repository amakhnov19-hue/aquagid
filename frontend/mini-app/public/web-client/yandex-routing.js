// ================ 🗺️ МОДУЛЬ ТОЧНОЙ МАРШРУТИЗАЦИИ ЯНДЕКС ================
// Версия 1.0.0 - Точный расчет времени с учетом пробок
// 2026-02-01

const ROUTING_DEBUG = true;

function routingLog(...args) {
  if (ROUTING_DEBUG) {
    console.log("🧭 [Маршрутизация]", ...args);
  }
}

/**
 * Основная функция: получить точное время маршрута
 */
async function getPreciseTravelTime(fromLat, fromLon, toLat, toLon) {
  return new Promise((resolve, reject) => {
    routingLog("📍 Запрос точного времени маршрута");
    routingLog(`От: ${fromLat}, ${fromLon}`);
    routingLog(`До: ${toLat}, ${toLon}`);

    // Ждем загрузку Яндекс.Карт
    if (typeof ymaps === "undefined") {
      routingLog("❌ Яндекс.Карты не загружены");
      reject(new Error("Яндекс.Карты не загружены"));
      return;
    }

    ymaps.ready(() => {
      try {
        routingLog("✅ Яндекс.Карты готовы");

        // Создаем маршрут
        ymaps
          .route(
            [
              [fromLat, fromLon], // Точка отправления
              [toLat, toLon], // Точка назначения
            ],
            {
              mapStateAutoApply: false, // Не показываем карту
              routingMode: "auto", // На автомобиле
              avoidTrafficJams: true, // Учитывать пробки
            },
          )
          .then(
            (route) => {
              // Успех!
              routingLog("✅ Маршрут построен");

              // Получаем время в СЕКУНДАХ, переводим в МИНУТЫ
              const timeWithJamsSeconds = route.getJamsTime();
              const timeWithoutJamsSeconds = route.getTime();

              const timeWithJams = Math.round(timeWithJamsSeconds / 60); // в минуты
              const timeWithoutJams = Math.round(timeWithoutJamsSeconds / 60); // в минуты
              const distance = route.getLength(); // в метрах

              routingLog(`📏 Расстояние: ${(distance / 1000).toFixed(1)} км`);
              routingLog(`⏱️ Время без пробок: ${timeWithoutJams} мин`);
              routingLog(`🚗 Время с пробками: ${timeWithJams} мин`);

              // Добавляем 10 минут на парковку/поиск причала
              const totalTime = timeWithJams + 10;

              routingLog(`🎯 Общее время: ${totalTime} мин`);

              resolve({
                success: true,
                travel_time_minutes: totalTime,
                distance_km: distance / 1000,
                time_without_jams: timeWithoutJams,
                time_with_jams: timeWithJams,
                route: route,
              });
            },
            (error) => {
              // Ошибка построения маршрута
              routingLog("❌ Ошибка построения маршрута:", error);
              reject(
                new Error(`Ошибка Яндекс.Маршрутизации: ${error.message}`),
              );
            },
          );
      } catch (error) {
        routingLog("❌ Критическая ошибка:", error);
        reject(error);
      }
    });
  });
}

/**
 * Рассчитывает расстояние между двумя точками в километрах
 * Используется как fallback когда Яндекс.Карты недоступны
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  try {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return null;
    }

    // Формула гаверсинусов для расчета расстояния на сфере
    const R = 6371; // Радиус Земли в км

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  } catch (error) {
    console.error("❌ Ошибка расчета расстояния:", error);
    return null;
  }
}

// Экспортируем в глобальную область
window.calculateDistanceKm = calculateDistanceKm;

/**
 * Упрощенная функция для быстрого использования
 */
async function calculateRouteTime(fromLat, fromLon, toLat, toLon) {
  const distance = calculateDistanceKm(fromLat, fromLon, toLat, toLon);
  if (!distance) return 30;
  
  // Коэффициент извилистости зависит от расстояния
  let coefficient;
  if (distance < 0.5) {
    coefficient = 1.1;
  } else if (distance < 2) {
    coefficient = 1.3;
  } else {
    coefficient = 1.5;
  }
  
  // Пешком ~5 км/ч + 5 минут на переходы
  return Math.round((distance * coefficient / 5) * 60) + 5;
}

// Экспорт функций в глобальную область видимости
window.getPreciseTravelTime = getPreciseTravelTime;
window.calculateRouteTime = calculateRouteTime;

// ================ 🚀 ФУНКЦИЯ БЫСТРОГО БРОНИРОВАНИЯ ================

/**
 * Рассчитывает время начала рейса для быстрого бронирования
 */
function calculateQuickBookingTime(travelTimeMinutes, mode = "pedestrian") {
  try {
    const now = new Date();
    console.log(
      "🕐 [Быстрое бронирование] Текущее время:",
      now.toLocaleTimeString(),
    );
    console.log(
      `🚶 [Быстрое бронирование] Время ${mode === "pedestrian" ? "пешком" : "на машине"}:`,
      travelTimeMinutes,
      "мин",
    );

    // 1. Проверяем что время дороги ≤ 20 минут
    if (travelTimeMinutes > 20) {
      console.log(
        "❌ [Быстрое бронирование] Слишком далеко:",
        travelTimeMinutes,
        "> 20 минут",
      );
      return null;
    }

    // 2. Разный буфер для разных типов
    const bufferMinutes = mode === "pedestrian" ? 5 : 10;

    // 3. Время прибытия к причалу
    const arrivalTime = new Date(now.getTime() + travelTimeMinutes * 60000);
    console.log(
      "📍 [Быстрое бронирование] Время прибытия:",
      arrivalTime.toLocaleTimeString(),
    );

    // 4. Добавляем буфер
    const readyTime = new Date(arrivalTime.getTime() + bufferMinutes * 60000);
    console.log(
      "⏱️ [Быстрое бронирование] Время готовности:",
      readyTime.toLocaleTimeString(),
    );

    // 5. Округляем ВВЕРХ до ближайших 30 минут (00 или 30)
    const readyMinutes = readyTime.getMinutes();
    let roundedMinutes;

    if (readyMinutes === 0) {
        roundedMinutes = 0;
    } else if (readyMinutes <= 30) {
        roundedMinutes = 30;
    } else {
        roundedMinutes = 0;
    }

    // 6. Создаем итоговое время
    let bookingTime = new Date(readyTime);

    if (roundedMinutes === 0 && readyMinutes > 30) {
        bookingTime.setMinutes(0);
        bookingTime.setHours(bookingTime.getHours() + 1);
    } else {
        bookingTime.setMinutes(roundedMinutes);
    }

    // 7. Минимум: текущее время + 30 минут
    const minTime = new Date(now.getTime() + 30 * 60000);
    if (bookingTime < minTime) {
      bookingTime = new Date(minTime);
      const minMinutes = bookingTime.getMinutes();
      if (minMinutes > 0 && minMinutes < 30) {
        bookingTime.setMinutes(30);
      } else if (minMinutes > 30 && minMinutes < 60) {
        bookingTime.setMinutes(0);
        bookingTime.setHours(bookingTime.getHours() + 1);
      }
    }

    console.log(
      "🎯 [Быстрое бронирование] Итоговое время:",
      bookingTime.toLocaleTimeString(),
    );
    return bookingTime;
  } catch (error) {
    console.error("❌ [Быстрое бронирование] Ошибка:", error);
    return null;
  }
}

// Экспортируем
window.calculateQuickBookingTime = calculateQuickBookingTime;

routingLog("✅ Функция быстрого бронирования добавлена");
routingLog("✅ Модуль точной маршрутизации загружен");

// Самодиагностика при загрузке
(function() {
    if (typeof window.calculateDistanceKm !== 'function') {
        console.error('❌ calculateDistanceKm не экспортирована!');
    }
    if (typeof window.calculateRouteTime !== 'function') {
        console.error('❌ calculateRouteTime не экспортирована!');
    }
    console.log('✅ Маршрутизация загружена');
})();
