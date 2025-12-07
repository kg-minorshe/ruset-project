/**
 * Централизованный обработчик ошибок.
 */
export const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        error: {
            details: err.details || null,
            status: err.status || 500,
            message: err.message || 'Внутренняя ошибка сервера',
        },
    });
};